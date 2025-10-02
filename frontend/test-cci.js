process.env.PAAS_APP_NAME = 'frontend-deploy';
process.env.PAAS_NAMESPACE = 'default';
process.env.PAAS_PROJECT_ID = '9803447aabf141f495dfa6939e308f6e';
process.env.OBS_ENDPOINT = 'https://obs.sa-brazil-1.myhuaweicloud.com';
process.env.OBS_ACCESS_KEY_ID = 'HPUAN9Q5XBMYMCBIYJOB';
process.env.OBS_SECRET_ACCESS_KEY = 'zOPTPPsAT9DAMZaiJvlXJaZRv0FJUb4ZQuRrGFPz';
process.env.OBS_BUCKET_NAME = 'videotogif';
process.env.OBS_UPLOAD_PREFIX = 'uploads/';
process.env.OBS_OUTPUT_PREFIX = 'gifs/';
process.env.PUBLIC_BASE_URL = 'http://101.44.201.177/';
process.env.HUAWEI_CLOUD_AK = 'HPUAN9Q5XBMYMCBIYJOB';
process.env.HUAWEI_CLOUD_SK = 'zOPTPPsAT9DAMZaiJvlXJaZRv0FJUb4ZQuRrGFPz';
process.env.HUAWEI_CLOUD_PROJECT_ID = '9803447aabf141f495dfa6939e308f6e';
process.env.CCI_REGION = 'sa-brazil-1';
process.env.CCI_NAMESPACE = 'v2g';
process.env.CCI_JOB_IMAGE = 'swr.sa-brazil-1.myhuaweicloud.com/videotogif/videotogif-converter:latest';

const crypto = require('crypto');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not configured`);
  }
  return value;
}

function encodeRfc3986(value) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%2F/g, '/');
}

function canonicalizePath(pathname) {
  if (!pathname) {
    return '/';
  }

  return pathname
    .split('/')
    .map((segment) => encodeRfc3986(segment))
    .join('/');
}

function canonicalizeQuery(searchParams) {
  const params = [];

  for (const [key, value] of Array.from(searchParams.entries()).sort()) {
    params.push(`${encodeRfc3986(key)}=${encodeRfc3986(value)}`);
  }

  return params.join('&');
}

function hashPayload(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function hmacSHA256(key, message) {
  return crypto.createHmac('sha256', key).update(message).digest();
}

function getSigningKey(secretKey, date, region, service) {
  const kSecret = 'SDK-HMAC-SHA256' + secretKey;
  const kDate = hmacSHA256(kSecret, date);
  const kRegion = hmacSHA256(kDate, region);
  const kService = hmacSHA256(kRegion, service);
  const kSigning = hmacSHA256(kService, 'sdk_request');
  return kSigning;
}

function buildAuthorization(method, url, headers, payload, accessKey, secretKey, region, service) {
  const canonicalUri = canonicalizePath(url.pathname);
  const canonicalQuery = canonicalizeQuery(url.searchParams);

  const headerEntries = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, ' ')])
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

  const date = sdkDate.slice(0, 8);
  const scope = `${date}/${region}/${service}/sdk_request`;
  const hashedCanonicalRequest = hashPayload(canonicalRequest);
  const stringToSign = `SDK-HMAC-SHA256\n${sdkDate}\n${scope}\n${hashedCanonicalRequest}`;
  const signingKey = getSigningKey(secretKey, date, region, service);
  const signature = hmacSHA256(signingKey, stringToSign).toString('hex');

  return `SDK-HMAC-SHA256 Access=${accessKey}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function buildJobName(jobId) {
  const sanitized = jobId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const trimmed = sanitized.length > 50 ? sanitized.slice(0, 50) : sanitized;
  return `videotogif-${trimmed}`;
}

function collectJobEnv(params) {
  const envVars = [
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

  return envVars;
}

async function createCciJob(params) {
  const accessKey = requireEnv('HUAWEI_CLOUD_AK');
  const secretKey = requireEnv('HUAWEI_CLOUD_SK');
  const projectId = requireEnv('HUAWEI_CLOUD_PROJECT_ID');
  const namespace = 'v2g';
  const region = process.env.CCI_REGION;
  const baseEndpoint = region ? `https://cci.${region}.myhuaweicloud.com` : undefined;
  if (!baseEndpoint) {
    throw new Error('CCI_REGION must be configured');
  }

  const image = requireEnv('CCI_JOB_IMAGE');
  const cpu = process.env.CCI_JOB_CPU ?? '1';
  const memory = process.env.CCI_JOB_MEMORY ?? '2Gi';
  const backoffLimit = Number.parseInt(process.env.CCI_JOB_BACKOFF_LIMIT ?? '0', 10);

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
          restartPolicy: 'Never',
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
  };

  const url = new URL('/apis', baseEndpoint);
  const body = '';

  const sdkDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '') + 'Z';

  const headers = {
    host: url.host,
    'x-project-id': projectId,
    'x-sdk-date': sdkDate,
  };

  const service = 'cci';
  const authorization = buildAuthorization('GET', url, headers, body, accessKey, secretKey, region, service);

  const requestHeaders = new Headers();
  requestHeaders.set('X-Project-Id', projectId);
  requestHeaders.set('X-Sdk-Date', sdkDate);
  requestHeaders.set('Authorization', authorization);

  console.log('curl -X GET', url.href);
  console.log('-H "Content-Type: application/json"');
  console.log('-H "X-Project-Id:', projectId + '"');
  console.log('-H "X-Sdk-Date:', sdkDate + '"');
  console.log('-H "Authorization:', authorization + '"');

  const response = await fetch(url, {
    method: 'GET',
    headers: requestHeaders,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CCI job creation failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const result = await response.json();
  return { jobName: result.metadata.name };
}

// Test function
async function test() {
  try {
    const result = await createCciJob({
      jobId: 'test-job-' + Date.now(),
      sourceKey: 'uploads/test.mp4',
      targetKey: 'gifs/test.gif',
      callbackUrl: 'http://example.com/callback',
    });
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();