import crypto from 'crypto';

export type CreateJobParams = {
  jobId: string;
  sourceKey: string;
  targetKey: string;
  callbackUrl: string;
};

export type CreateJobResult = {
  jobName: string;
};

class MissingConfigurationError extends Error {}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new MissingConfigurationError(`${name} environment variable is not configured`);
  }
  return value;
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%2F/g, '/');
}

function canonicalizePath(pathname: string) {
  if (!pathname) {
    return '/';
  }

  return pathname
    .split('/')
    .map((segment) => encodeRfc3986(segment))
    .join('/');
}

function canonicalizeQuery(searchParams: URLSearchParams) {
  const params: string[] = [];

  for (const [key, value] of Array.from(searchParams.entries()).sort()) {
    params.push(`${encodeRfc3986(key)}=${encodeRfc3986(value)}`);
  }

  return params.join('&');
}

function hashPayload(payload: string) {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function hmacSHA256(key: string, message: string) {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

function buildAuthorization(
  method: string,
  url: URL,
  headers: Record<string, string>,
  payload: string,
  accessKey: string,
  secretKey: string
) {
  const canonicalUri = canonicalizePath(url.pathname);
  const canonicalQuery = canonicalizeQuery(url.searchParams);

  const headerEntries = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, ' ')] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const canonicalHeaders = headerEntries.map(([name, value]) => `${name}:${value}`).join('\n');
  const signedHeaders = headerEntries.map(([name]) => name).join(';');

  const payloadHash = hashPayload(payload);
  const canonicalRequest = [method.toUpperCase(), canonicalUri, canonicalQuery, `${canonicalHeaders}\n`, signedHeaders, payloadHash]
    .join('\n');

  const sdkDate = headers['x-sdk-date'];
  if (!sdkDate) {
    throw new Error('x-sdk-date header is required for signing');
  }

  const hashedCanonicalRequest = hashPayload(canonicalRequest);
  const stringToSign = `SDK-HMAC-SHA256\n${sdkDate}\n${hashedCanonicalRequest}`;
  const signature = hmacSHA256(secretKey, stringToSign);

  return `SDK-HMAC-SHA256 Access=${accessKey}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function buildJobName(jobId: string) {
  const sanitized = jobId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const trimmed = sanitized.length > 50 ? sanitized.slice(0, 50) : sanitized;
  return `videotogif-${trimmed}`;
}

function collectJobEnv(params: CreateJobParams) {
  const envVars: Array<{ name: string; value: string }> = [
    { name: 'JOB_ID', value: params.jobId },
    { name: 'SOURCE_OBJECT_KEY', value: params.sourceKey },
    { name: 'TARGET_OBJECT_KEY', value: params.targetKey },
    { name: 'CALLBACK_URL', value: params.callbackUrl },
  ];

  const passthroughVars = [
    'OBS_ENDPOINT',
    'OBS_ACCESS_KEY_ID',
    'OBS_SECRET_ACCESS_KEY',
    'OBS_SECURITY_TOKEN',
    'OBS_BUCKET_NAME',
  ];

  for (const variable of passthroughVars) {
    const value = process.env[variable];
    if (value) {
      envVars.push({ name: variable, value });
    }
  }

  const additional = process.env.CCI_ADDITIONAL_ENV_VARS;
  if (additional) {
    for (const entry of additional.split(',').map((item) => item.trim()).filter(Boolean)) {
      const value = process.env[entry];
      if (value) {
        envVars.push({ name: entry, value });
      }
    }
  }

  return envVars;
}

export async function createCciJob(params: CreateJobParams): Promise<CreateJobResult> {
  const accessKey = requireEnv('HUAWEI_CLOUD_AK');
  const secretKey = requireEnv('HUAWEI_CLOUD_SK');
  const projectId = requireEnv('HUAWEI_CLOUD_PROJECT_ID');
  const namespace = process.env.CCI_NAMESPACE ?? 'default';
  const region = process.env.CCI_REGION;
  const baseEndpoint = process.env.CCI_API_ENDPOINT ?? (region ? `https://cci.${region}.myhuaweicloud.com` : undefined);
  if (!baseEndpoint) {
    throw new MissingConfigurationError('CCI_API_ENDPOINT or CCI_REGION must be configured');
  }

  const image = requireEnv('CCI_JOB_IMAGE');
  const cpu = process.env.CCI_JOB_CPU ?? '1';
  const memory = process.env.CCI_JOB_MEMORY ?? '2Gi';
  const backoffLimit = Number.parseInt(process.env.CCI_JOB_BACKOFF_LIMIT ?? '0', 10);
  const ttlSecondsAfterFinished = process.env.CCI_JOB_TTL_SECONDS
    ? Number.parseInt(process.env.CCI_JOB_TTL_SECONDS, 10)
    : undefined;
  const serviceAccount = process.env.CCI_SERVICE_ACCOUNT_NAME;
  const imagePullSecret = process.env.CCI_IMAGE_PULL_SECRET;

  const jobName = buildJobName(params.jobId);
  const payload = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: jobName,
      labels: {
        'app.kubernetes.io/name': 'videotogif-converter',
        'app.kubernetes.io/component': 'converter-job',
        'videotogif/job-id': params.jobId,
      },
    },
    spec: {
      backoffLimit: Number.isNaN(backoffLimit) ? 0 : backoffLimit,
      template: {
        metadata: {
          labels: {
            'app.kubernetes.io/name': 'videotogif-converter',
            'videotogif/job-id': params.jobId,
          },
        },
        spec: {
          restartPolicy: 'Never' as const,
          containers: [
            {
              name: 'converter',
              image,
              imagePullPolicy: process.env.CCI_JOB_IMAGE_PULL_POLICY ?? 'Always',
              env: collectJobEnv(params),
              resources: {
                requests: { cpu, memory },
                limits: { cpu, memory },
              },
            },
          ],
        },
      },
    },
  } as Record<string, unknown>;

  if (serviceAccount) {
    (payload.spec as any).template.spec.serviceAccount = serviceAccount;
    (payload.spec as any).template.spec.serviceAccountName = serviceAccount;
  }

  if (imagePullSecret) {
    (payload.spec as any).template.spec.imagePullSecrets = [{ name: imagePullSecret }];
  }

  if (typeof ttlSecondsAfterFinished === 'number' && !Number.isNaN(ttlSecondsAfterFinished)) {
    (payload.spec as any).ttlSecondsAfterFinished = ttlSecondsAfterFinished;
  }

  const url = new URL(`/apis/batch/v1/namespaces/${encodeURIComponent(namespace)}/jobs`, baseEndpoint);
  const body = JSON.stringify(payload);

  const sdkDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '') + 'Z';

  const headers: Record<string, string> = {
    host: url.host,
    'content-type': 'application/json',
    'x-project-id': projectId,
    'x-sdk-date': sdkDate,
  };

  const authorization = buildAuthorization('POST', url, headers, body, accessKey, secretKey);

  const requestHeaders = new Headers();
  requestHeaders.set('Content-Type', 'application/json');
  requestHeaders.set('X-Project-Id', projectId);
  requestHeaders.set('X-Sdk-Date', sdkDate);
  requestHeaders.set('Authorization', authorization);
  if (process.env.CCI_USER_AGENT) {
    requestHeaders.set('User-Agent', process.env.CCI_USER_AGENT);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: requestHeaders,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CCI job creation failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return { jobName };
}

export function isMissingConfiguration(error: unknown): error is MissingConfigurationError {
  return error instanceof MissingConfigurationError;
}
