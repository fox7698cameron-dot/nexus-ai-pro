// src/integrations/CloudConnectors.js
// Nexus AI Pro — Cloud & Service Connectors
// Azure, AWS, Google Cloud, Slack, Zoom, GitHub, Bitbucket, Adobe
// Updated: 2026-05-03

export const CONNECTOR_CATALOG = {
  // ── Microsoft Azure ────────────────────────────────────────────────────────
  azure_storage: {
    id: 'azure_storage', label: 'Azure Blob Storage', category: 'storage',
    icon: '☁️', company: 'Microsoft',
    envVars: ['AZURE_STORAGE_ACCOUNT', 'AZURE_STORAGE_KEY'],
    description: 'Store and retrieve files from Azure Blob Storage',
    docs: 'https://docs.microsoft.com/azure/storage/blobs',
  },
  azure_ai: {
    id: 'azure_ai', label: 'Azure OpenAI', category: 'ai',
    icon: '🤖', company: 'Microsoft',
    envVars: ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_KEY', 'AZURE_OPENAI_DEPLOYMENT'],
    description: 'Use GPT-4 and embeddings via Azure OpenAI Service',
  },
  azure_ad: {
    id: 'azure_ad', label: 'Azure Active Directory', category: 'auth',
    icon: '🔐', company: 'Microsoft',
    envVars: ['AZURE_AD_TENANT_ID', 'AZURE_AD_CLIENT_ID', 'AZURE_AD_CLIENT_SECRET'],
    description: 'Single sign-on and identity management via Azure AD',
  },

  // ── Amazon Web Services ────────────────────────────────────────────────────
  aws_s3: {
    id: 'aws_s3', label: 'AWS S3', category: 'storage',
    icon: '🪣', company: 'Amazon',
    envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'],
    description: 'Store objects and files in Amazon S3 buckets',
  },
  aws_bedrock: {
    id: 'aws_bedrock', label: 'AWS Bedrock', category: 'ai',
    icon: '🧠', company: 'Amazon',
    envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
    description: 'Access foundation models (Claude, Titan, Llama) via AWS Bedrock',
  },
  aws_ses: {
    id: 'aws_ses', label: 'AWS SES (Email)', category: 'messaging',
    icon: '📧', company: 'Amazon',
    envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_SES_FROM'],
    description: 'Send transactional and marketing emails via Amazon SES',
  },

  // ── Google Cloud ───────────────────────────────────────────────────────────
  gcp_storage: {
    id: 'gcp_storage', label: 'Google Cloud Storage', category: 'storage',
    icon: '🗃️', company: 'Google',
    envVars: ['GCP_PROJECT_ID', 'GCP_STORAGE_BUCKET', 'GOOGLE_APPLICATION_CREDENTIALS'],
    description: 'Object storage with global distribution',
  },
  google_ai: {
    id: 'google_ai', label: 'Google Gemini', category: 'ai',
    icon: '✨', company: 'Google',
    envVars: ['GOOGLE_API_KEY'],
    description: 'Gemini Pro, Ultra, and Flash via Vertex AI',
  },
  google_translate: {
    id: 'google_translate', label: 'Google Translate', category: 'translation',
    icon: '🌐', company: 'Google',
    envVars: ['GOOGLE_TRANSLATE_API_KEY'],
    description: 'Auto-translate content across 100+ languages',
  },

  // ── Collaboration ──────────────────────────────────────────────────────────
  slack: {
    id: 'slack', label: 'Slack', category: 'messaging',
    icon: '💬', company: 'Slack',
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_WEBHOOK_URL'],
    description: 'Send notifications and receive commands via Slack',
  },
  zoom: {
    id: 'zoom', label: 'Zoom', category: 'video',
    icon: '📹', company: 'Zoom',
    envVars: ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
    description: 'Create meetings, webinars, and live streams',
  },

  // ── Version Control ────────────────────────────────────────────────────────
  github: {
    id: 'github', label: 'GitHub', category: 'devtools',
    icon: '🐙', company: 'GitHub / Microsoft',
    envVars: ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'],
    description: 'Manage repos, issues, PRs, and CI via GitHub API',
  },
  bitbucket: {
    id: 'bitbucket', label: 'Bitbucket', category: 'devtools',
    icon: '🔵', company: 'Atlassian',
    envVars: ['BITBUCKET_USERNAME', 'BITBUCKET_APP_PASSWORD', 'BITBUCKET_WORKSPACE'],
    description: 'Repository management and CI/CD via Bitbucket',
  },

  // ── Creative ───────────────────────────────────────────────────────────────
  adobe: {
    id: 'adobe', label: 'Adobe Creative Cloud', category: 'creative',
    icon: '🎨', company: 'Adobe',
    envVars: ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET', 'ADOBE_ORG_ID'],
    description: 'Asset management and creative workflows via Adobe APIs',
  },
};

export const CONNECTOR_CATEGORIES = {
  storage:     { label: 'Storage',       icon: '🗄️', color: '#3b82f6' },
  ai:          { label: 'AI / Models',   icon: '🤖', color: '#8b5cf6' },
  auth:        { label: 'Auth & IAM',    icon: '🔐', color: '#ef4444' },
  messaging:   { label: 'Messaging',     icon: '💬', color: '#22c55e' },
  video:       { label: 'Video',         icon: '📹', color: '#f59e0b' },
  devtools:    { label: 'Dev Tools',     icon: '🛠️', color: '#6366f1' },
  translation: { label: 'Translation',   icon: '🌐', color: '#06b6d4' },
  creative:    { label: 'Creative',      icon: '🎨', color: '#ec4899' },
};

// ─── Server-side connector helpers ────────────────────────────────────────────

export async function sendSlackNotification(message, channel = '#general') {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('SLACK_WEBHOOK_URL not configured');
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message, channel }),
  });
  if (!res.ok) throw new Error(`Slack webhook failed: ${res.statusText}`);
}

export async function createGitHubIssue(title, body, labels = []) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) throw new Error('GitHub credentials not configured');
  const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ title, body, labels }),
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.statusText}`);
  return res.json();
}

export async function createZoomMeeting(topic, startTime, duration = 60) {
  const accountId    = process.env.ZOOM_ACCOUNT_ID;
  const clientId     = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) throw new Error('Zoom credentials not configured');

  const tokenRes = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
  });
  if (!tokenRes.ok) throw new Error('Failed to obtain Zoom access token');
  const { access_token } = await tokenRes.json();

  const meetRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, type: 2, start_time: startTime, duration }),
  });
  if (!meetRes.ok) throw new Error(`Zoom meeting creation failed: ${meetRes.statusText}`);
  return meetRes.json();
}

export async function translateText(text, targetLang, sourceLang = 'en') {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_TRANSLATE_API_KEY not configured');
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: 'text' }),
  });
  if (!res.ok) throw new Error(`Translation failed: ${res.statusText}`);
  const data = await res.json();
  return data?.data?.translations?.[0]?.translatedText || text;
}
