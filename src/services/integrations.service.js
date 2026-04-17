// nexus-ai-pro/src/services/integrations.service.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Cloud & tool integrations: Azure, AWS, GCP, Slack, Zoom, GitHub, Bitbucket,
// Adobe, Redis, Blob storage — all credentials via env, never hardcoded

// ── Helper: require env var ───────────────────────────────────
function env(key) {
  const val = process.env[key];
  if (!val) throw new Error(`${key} env var is required`);
  return val;
}

// ── Slack ─────────────────────────────────────────────────────
export async function sendSlackMessage({ channel, text, blocks }) {
  const token = env('SLACK_BOT_TOKEN');
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, text, blocks }),
  });
  return res.json();
}

// ── Zoom ──────────────────────────────────────────────────────
export async function createZoomMeeting({ topic, durationMin = 60, scheduledAt }) {
  const token = env('ZOOM_JWT_TOKEN');
  const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      type: scheduledAt ? 2 : 1,
      duration: durationMin,
      start_time: scheduledAt,
      settings: { join_before_host: false, waiting_room: true },
    }),
  });
  if (!res.ok) throw new Error(`Zoom API ${res.status}`);
  return res.json();
}

// ── GitHub REST (server-side) ─────────────────────────────────
async function githubGet(path) {
  const token = env('GITHUB_TOKEN');
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

export const github = {
  getRepo: (owner, repo) => githubGet(`/repos/${owner}/${repo}`),
  listWorkflowRuns: (owner, repo) => githubGet(`/repos/${owner}/${repo}/actions/runs?per_page=5`),
  getUser: () => githubGet('/user'),
};

// ── Bitbucket ─────────────────────────────────────────────────
export async function getBitbucketRepo(workspace, slug) {
  const token = env('BITBUCKET_ACCESS_TOKEN');
  const res = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Bitbucket API ${res.status}`);
  return res.json();
}

// ── Azure ─────────────────────────────────────────────────────
// Uses REST management API; credentials via AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
async function getAzureToken() {
  const tenantId = env('AZURE_TENANT_ID');
  const clientId = env('AZURE_CLIENT_ID');
  const clientSecret = env('AZURE_CLIENT_SECRET');
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://management.azure.com/.default',
      }),
    }
  );
  const data = await res.json();
  return data.access_token;
}

export async function listAzureResourceGroups() {
  const token = await getAzureToken();
  const subscriptionId = env('AZURE_SUBSCRIPTION_ID');
  const res = await fetch(
    `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Azure API ${res.status}`);
  return res.json();
}

// ── AWS (using signed requests — no SDK to avoid large dep) ───
// Route-level callers should use the AWS SDK via env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
export function getAwsConfig() {
  return {
    region: env('AWS_REGION'),
    accessKeyId: env('AWS_ACCESS_KEY_ID'),
    secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
  };
}

// ── Google Cloud (service account via env) ────────────────────
export function getGcpConfig() {
  return {
    projectId: env('GCP_PROJECT_ID'),
    clientEmail: env('GCP_CLIENT_EMAIL'),
    privateKey: env('GCP_PRIVATE_KEY').replace(/\\n/g, '\n'),
  };
}

// ── Adobe (Creative Cloud / Firefly API) ─────────────────────
export async function getAdobeToken() {
  const clientId = env('ADOBE_CLIENT_ID');
  const clientSecret = env('ADOBE_CLIENT_SECRET');
  const res = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'openid,creative_sdk,AdobeID',
    }),
  });
  if (!res.ok) throw new Error(`Adobe auth ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// ── Redis (connection config only — driver selected at app layer) ──
export function getRedisConfig() {
  const url = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST ?? 'localhost'}:${process.env.REDIS_PORT ?? 6379}`;
  return { url, tls: process.env.REDIS_TLS === 'true' };
}

// ── Blob Storage (S3-compatible / Azure Blob) ─────────────────
export function getBlobConfig() {
  const provider = process.env.BLOB_PROVIDER ?? 's3';
  if (provider === 's3') {
    return {
      provider: 's3',
      bucket: env('S3_BUCKET'),
      region: env('AWS_REGION'),
      endpoint: process.env.S3_ENDPOINT,  // optional for S3-compatible stores
    };
  }
  if (provider === 'azure') {
    return {
      provider: 'azure',
      connectionString: env('AZURE_STORAGE_CONNECTION_STRING'),
      container: env('AZURE_BLOB_CONTAINER'),
    };
  }
  throw new Error(`Unknown BLOB_PROVIDER: ${provider}`);
}

// ── Integration health check ──────────────────────────────────
export function getIntegrationStatus() {
  const checks = {
    slack:     !!process.env.SLACK_BOT_TOKEN,
    zoom:      !!process.env.ZOOM_JWT_TOKEN,
    github:    !!process.env.GITHUB_TOKEN,
    bitbucket: !!process.env.BITBUCKET_ACCESS_TOKEN,
    azure:     !!(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID),
    aws:       !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    gcp:       !!(process.env.GCP_PROJECT_ID && process.env.GCP_CLIENT_EMAIL),
    adobe:     !!(process.env.ADOBE_CLIENT_ID && process.env.ADOBE_CLIENT_SECRET),
    redis:     !!(process.env.REDIS_URL || process.env.REDIS_HOST),
    blob:      !!process.env.BLOB_PROVIDER,
    stripe:    !!process.env.STRIPE_SECRET_KEY,
  };
  return checks;
}
