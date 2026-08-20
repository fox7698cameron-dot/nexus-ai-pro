// ================================================
// File:        src/connectors/cloud-connectors.js
// Purpose:     Cloud + collaboration connector registry — Azure, Adobe, AWS,
//              Google Cloud, Slack, Zoom, GitHub, Bitbucket, Redis, and
//              blob-storage.  Each connector reports configuration state
//              only — never secrets — for the admin dashboard.
// Created:     2026-08-20
// Last-edit:   2026-08-20
// Owner:       Nexus AI Pro platform team
// ================================================

const REGISTRY = new Map();

class CloudConnector {
  constructor({ id, name, category, envKeys, docs }) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.envKeys = envKeys;
    this.docs = docs;
  }
  isConfigured() { return this.envKeys.every((k) => !!process.env[k]); }
  status() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      configured: this.isConfigured(),
      envKeys: this.envKeys,
      docs: this.docs
    };
  }
}

function register(c) { REGISTRY.set(c.id, c); }

register(new CloudConnector({
  id: 'azure', name: 'Microsoft Azure', category: 'cloud',
  envKeys: ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'],
  docs: 'https://learn.microsoft.com/azure/active-directory/develop/'
}));
register(new CloudConnector({
  id: 'aws', name: 'Amazon Web Services', category: 'cloud',
  envKeys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
  docs: 'https://docs.aws.amazon.com/sdkref/latest/guide/creds-config-files.html'
}));
register(new CloudConnector({
  id: 'gcp', name: 'Google Cloud', category: 'cloud',
  envKeys: ['GOOGLE_APPLICATION_CREDENTIALS'],
  docs: 'https://cloud.google.com/docs/authentication/application-default-credentials'
}));
register(new CloudConnector({
  id: 'adobe', name: 'Adobe Creative Cloud', category: 'creative',
  envKeys: ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET'],
  docs: 'https://developer.adobe.com/developer-console/docs/guides/'
}));
register(new CloudConnector({
  id: 'slack', name: 'Slack', category: 'collab',
  envKeys: ['SLACK_BOT_TOKEN'],
  docs: 'https://api.slack.com/authentication/token-types'
}));
register(new CloudConnector({
  id: 'zoom', name: 'Zoom', category: 'collab',
  envKeys: ['ZOOM_OAUTH_TOKEN'],
  docs: 'https://developers.zoom.us/docs/integrations/oauth/'
}));
register(new CloudConnector({
  id: 'github', name: 'GitHub', category: 'devops',
  envKeys: ['GITHUB_TOKEN'],
  docs: 'https://docs.github.com/en/rest/authentication/'
}));
register(new CloudConnector({
  id: 'bitbucket', name: 'Bitbucket', category: 'devops',
  envKeys: ['BITBUCKET_APP_PASSWORD', 'BITBUCKET_USERNAME'],
  docs: 'https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/'
}));
register(new CloudConnector({
  id: 'redis', name: 'Redis', category: 'store',
  envKeys: ['REDIS_URL'],
  docs: 'https://redis.io/docs/latest/develop/connect/'
}));
register(new CloudConnector({
  id: 'blob', name: 'Blob storage (S3 / Azure Blob / GCS)', category: 'store',
  envKeys: ['BLOB_ENDPOINT', 'BLOB_ACCESS_KEY', 'BLOB_SECRET_KEY'],
  docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/CommonUsageScenarios.html'
}));

export function listCloudConnectors() {
  return [...REGISTRY.values()].map((c) => c.status());
}

export function getCloudConnector(id) {
  const c = REGISTRY.get(id);
  return c ? c.status() : null;
}

export const CLOUD_CONNECTOR_IDS = () => [...REGISTRY.keys()];
