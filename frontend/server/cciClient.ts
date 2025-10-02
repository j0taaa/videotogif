import { BasicCredentials } from '@huaweicloud/huaweicloud-sdk-core/auth/BasicCredentials';
import { ClientBuilder } from '@huaweicloud/huaweicloud-sdk-core/ClientBuilder';
import type { HcClient } from '@huaweicloud/huaweicloud-sdk-core/HcClient';

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

function requireEnvWithFallback(primary: string, fallbacks: string[]): string {
  const value = process.env[primary];
  if (value) {
    return value;
  }

  for (const fallback of fallbacks) {
    const fallbackValue = process.env[fallback];
    if (fallbackValue) {
      return fallbackValue;
    }
  }

  const sources = [primary, ...fallbacks].join(' or ');
  throw new MissingConfigurationError(`${sources} environment variable is not configured`);
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

  console.log('[cciClient] Collected environment variables for converter job', {
    jobId: params.jobId,
    exportedVariables: envVars.map((variable) => variable.name),
  });

  return envVars;
}

export async function createCciJob(params: CreateJobParams): Promise<CreateJobResult> {
  console.log('[cciClient] Creating CCI job request', {
    jobId: params.jobId,
    sourceKey: params.sourceKey,
    targetKey: params.targetKey,
    callbackHost: (() => {
      try {
        const parsed = new URL(params.callbackUrl);
        return `${parsed.protocol}//${parsed.host}`;
      } catch (error) {
        console.warn('[cciClient] Unable to parse callback URL while logging host', error);
        return null;
      }
    })(),
  });
  const accessKey = requireEnvWithFallback('HUAWEI_CLOUD_AK', ['OBS_ACCESS_KEY_ID']);
  const secretKey = requireEnvWithFallback('HUAWEI_CLOUD_SK', ['OBS_SECRET_ACCESS_KEY']);
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
  console.log('[cciClient] Converter job payload prepared', {
    jobId: params.jobId,
    jobName,
    namespace,
    region,
    baseEndpoint,
    image,
    cpu,
    memory,
    backoffLimit,
    ttlSecondsAfterFinished,
    serviceAccountConfigured: Boolean(serviceAccount),
    imagePullSecretConfigured: Boolean(imagePullSecret),
  });
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

  const credentials = new BasicCredentials()
    .withAk(accessKey)
    .withSk(secretKey)
    .withProjectId(projectId);

  const client = new ClientBuilder<HcClient>((hcClient) => hcClient)
    .withCredential(credentials)
    .withEndpoint(baseEndpoint)
    .build();

  const userAgent = process.env.CCI_USER_AGENT;
  const path = `/apis/batch/v1/namespaces/${encodeURIComponent(namespace)}/jobs`;

  try {
    console.log('[cciClient] Sending job creation request to Huawei Cloud CCI', {
      jobId: params.jobId,
      path,
      userAgentConfigured: Boolean(userAgent),
    });
    await client.sendRequest({
      method: 'POST',
      url: path,
      contentType: 'application/json',
      headers: {
        'X-Project-Id': projectId,
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
      },
      queryParams: {},
      pathParams: {},
      data: payload as Record<string, any>,
    });
    console.log('[cciClient] Job creation request accepted by API', { jobId: params.jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('[cciClient] Job creation request failed', { jobId: params.jobId, message, error });
    throw new Error(`CCI job creation failed: ${message}`);
  }

  return { jobName };
}

export function isMissingConfiguration(error: unknown): error is MissingConfigurationError {
  return error instanceof MissingConfigurationError;
}
