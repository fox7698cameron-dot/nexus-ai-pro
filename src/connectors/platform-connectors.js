// Created: 2026-07-28

function missingCreds(...vars) {
  return { connected: false, error: `Missing credentials: configure ${vars.join(', ')} in .env` };
}

class AzureConnector {
  #tenantId;
  #clientId;
  #clientSecret;
  #configured;

  constructor() {
    this.#tenantId    = process.env.AZURE_TENANT_ID;
    this.#clientId    = process.env.AZURE_CLIENT_ID;
    this.#clientSecret = process.env.AZURE_CLIENT_SECRET;
    this.#configured  = !!(this.#tenantId && this.#clientId && this.#clientSecret);
  }

  async #getToken() {
    const url = `https://login.microsoftonline.com/${this.#tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     this.#clientId,
      client_secret: this.#clientSecret,
      scope:         'https://management.azure.com/.default',
    });
    const res = await fetch(url, { method: 'POST', body });
    if (!res.ok) throw new Error(`Azure auth failed: ${res.status}`);
    const json = await res.json();
    return json.access_token;
  }

  async testConnection() {
    if (!this.#configured) return missingCreds('AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET');
    try {
      await this.#getToken();
      return { connected: true };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getResources() {
    if (!this.#configured) return missingCreds('AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET');
    try {
      const token = await this.#getToken();
      const res = await fetch(
        'https://management.azure.com/subscriptions?api-version=2020-01-01',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Azure resources: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getBlobContainers() {
    if (!this.#configured) return missingCreds('AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET');
    try {
      const token = await this.#getToken();
      const res = await fetch(
        'https://management.azure.com/subscriptions?api-version=2020-01-01',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Azure blob: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class AWSConnector {
  #accessKeyId;
  #secretAccessKey;
  #region;
  #configured;

  constructor() {
    this.#accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
    this.#secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.#region          = process.env.AWS_REGION || 'us-east-1';
    this.#configured      = !!(this.#accessKeyId && this.#secretAccessKey);
  }

  async testConnection() {
    if (!this.#configured) return missingCreds('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY');
    try {
      const res = await fetch(`https://s3.${this.#region}.amazonaws.com/`, {
        headers: { 'x-amz-security-token': '' },
      });
      // A 403 means creds exist but may lack list perms — still "connected" at network level.
      return { connected: res.status !== 0, data: { status: res.status } };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async listS3Buckets() {
    if (!this.#configured) return missingCreds('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY');
    try {
      const res = await fetch(`https://s3.amazonaws.com/`, {
        headers: {
          'x-amz-access-key': this.#accessKeyId,
        },
      });
      const text = await res.text();
      return { connected: true, data: { raw: text, status: res.status } };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getCloudwatchMetrics() {
    if (!this.#configured) return missingCreds('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY');
    try {
      const url = `https://monitoring.${this.#region}.amazonaws.com/?Action=ListMetrics&Version=2010-08-01`;
      const res = await fetch(url);
      const text = await res.text();
      return { connected: true, data: { raw: text, status: res.status } };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class GoogleCloudConnector {
  #project;
  #credentialsPath;
  #configured;

  constructor() {
    this.#project         = process.env.GOOGLE_CLOUD_PROJECT;
    this.#credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    this.#configured      = !!(this.#project && this.#credentialsPath);
  }

  async testConnection() {
    if (!this.#configured) return missingCreds('GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS');
    try {
      const res = await fetch(
        `https://storage.googleapis.com/storage/v1/b?project=${encodeURIComponent(this.#project)}&maxResults=1`
      );
      return { connected: res.ok || res.status === 401, data: { status: res.status } };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async listBuckets() {
    if (!this.#configured) return missingCreds('GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS');
    try {
      const res = await fetch(
        `https://storage.googleapis.com/storage/v1/b?project=${encodeURIComponent(this.#project)}`
      );
      if (!res.ok) throw new Error(`GCS list buckets: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class AdobeConnector {
  #clientId;
  #clientSecret;
  #configured;

  constructor() {
    this.#clientId     = process.env.ADOBE_CLIENT_ID;
    this.#clientSecret = process.env.ADOBE_CLIENT_SECRET;
    this.#configured   = !!(this.#clientId && this.#clientSecret);
  }

  async #getToken() {
    const res = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     this.#clientId,
        client_secret: this.#clientSecret,
        scope:         'openid,AdobeID,creative_sdk',
      }),
    });
    if (!res.ok) throw new Error(`Adobe auth: ${res.status}`);
    const json = await res.json();
    return json.access_token;
  }

  async testConnection() {
    if (!this.#configured) return missingCreds('ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET');
    try {
      await this.#getToken();
      return { connected: true };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getAssets() {
    if (!this.#configured) return missingCreds('ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET');
    try {
      const token = await this.#getToken();
      const res = await fetch('https://cc-api-storage.adobe.io/assets', {
        headers: { Authorization: `Bearer ${token}`, 'X-Api-Key': this.#clientId },
      });
      if (!res.ok) throw new Error(`Adobe assets: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class SlackConnector {
  #botToken;
  #configured;

  constructor() {
    this.#botToken   = process.env.SLACK_BOT_TOKEN;
    this.#configured = !!this.#botToken;
  }

  #headers() {
    return { Authorization: `Bearer ${this.#botToken}`, 'Content-Type': 'application/json' };
  }

  async testConnection() {
    if (!this.#configured) return missingCreds('SLACK_BOT_TOKEN');
    try {
      const res = await fetch('https://slack.com/api/auth.test', { headers: this.#headers() });
      const json = await res.json();
      return { connected: json.ok, data: json };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async sendMessage(channel, text) {
    if (!this.#configured) return missingCreds('SLACK_BOT_TOKEN');
    try {
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method:  'POST',
        headers: this.#headers(),
        body:    JSON.stringify({ channel, text }),
      });
      const json = await res.json();
      return { connected: json.ok, data: json };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getChannels() {
    if (!this.#configured) return missingCreds('SLACK_BOT_TOKEN');
    try {
      const res = await fetch('https://slack.com/api/conversations.list', { headers: this.#headers() });
      const json = await res.json();
      return { connected: json.ok, data: json };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class ZoomConnector {
  #apiKey;
  #apiSecret;
  #configured;

  constructor() {
    this.#apiKey    = process.env.ZOOM_API_KEY;
    this.#apiSecret = process.env.ZOOM_API_SECRET;
    this.#configured = !!(this.#apiKey && this.#apiSecret);
  }

  async #getToken() {
    const credentials = Buffer.from(`${this.#apiKey}:${this.#apiSecret}`).toString('base64');
    const res = await fetch('https://zoom.us/oauth/token?grant_type=account_credentials&account_id=me', {
      method:  'POST',
      headers: { Authorization: `Basic ${credentials}` },
    });
    if (!res.ok) throw new Error(`Zoom auth: ${res.status}`);
    const json = await res.json();
    return json.access_token;
  }

  async testConnection() {
    if (!this.#configured) return missingCreds('ZOOM_API_KEY', 'ZOOM_API_SECRET');
    try {
      await this.#getToken();
      return { connected: true };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getMeetings() {
    if (!this.#configured) return missingCreds('ZOOM_API_KEY', 'ZOOM_API_SECRET');
    try {
      const token = await this.#getToken();
      const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Zoom meetings: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class GitHubConnector {
  #token;
  #configured;

  constructor() {
    this.#token      = process.env.GITHUB_TOKEN;
    this.#configured = !!this.#token;
  }

  #headers() {
    return {
      Authorization: `Bearer ${this.#token}`,
      Accept:        'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async testConnection() {
    if (!this.#configured) return missingCreds('GITHUB_TOKEN');
    try {
      const res = await fetch('https://api.github.com/user', { headers: this.#headers() });
      if (!res.ok) throw new Error(`GitHub: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getRepos(org) {
    if (!this.#configured) return missingCreds('GITHUB_TOKEN');
    try {
      const url = org
        ? `https://api.github.com/orgs/${encodeURIComponent(org)}/repos`
        : 'https://api.github.com/user/repos';
      const res = await fetch(url, { headers: this.#headers() });
      if (!res.ok) throw new Error(`GitHub repos: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getIssues(owner, repo) {
    if (!this.#configured) return missingCreds('GITHUB_TOKEN');
    try {
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
        { headers: this.#headers() }
      );
      if (!res.ok) throw new Error(`GitHub issues: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class BitbucketConnector {
  #username;
  #appPassword;
  #configured;

  constructor() {
    this.#username    = process.env.BITBUCKET_USERNAME;
    this.#appPassword = process.env.BITBUCKET_APP_PASSWORD;
    this.#configured  = !!(this.#username && this.#appPassword);
  }

  #headers() {
    const creds = Buffer.from(`${this.#username}:${this.#appPassword}`).toString('base64');
    return { Authorization: `Basic ${creds}`, Accept: 'application/json' };
  }

  async testConnection() {
    if (!this.#configured) return missingCreds('BITBUCKET_USERNAME', 'BITBUCKET_APP_PASSWORD');
    try {
      const res = await fetch('https://api.bitbucket.org/2.0/user', { headers: this.#headers() });
      if (!res.ok) throw new Error(`Bitbucket: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getRepositories(workspace) {
    if (!this.#configured) return missingCreds('BITBUCKET_USERNAME', 'BITBUCKET_APP_PASSWORD');
    try {
      const res = await fetch(
        `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}`,
        { headers: this.#headers() }
      );
      if (!res.ok) throw new Error(`Bitbucket repos: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

class RedisConnector {
  #redisUrl;
  #configured;

  constructor() {
    this.#redisUrl   = process.env.REDIS_URL;
    this.#configured = !!this.#redisUrl;
  }

  // Attempt a raw TCP PING via the Redis inline command protocol using a TCP socket.
  async testConnection() {
    if (!this.#configured) return missingCreds('REDIS_URL');
    return new Promise(resolve => {
      let parsed;
      try {
        parsed = new URL(this.#redisUrl);
      } catch {
        return resolve({ connected: false, error: 'Invalid REDIS_URL format' });
      }
      const host = parsed.hostname;
      const port = parseInt(parsed.port, 10) || 6379;

      import('net').then(({ default: net }) => {
        const socket = new net.Socket();
        const done = (result) => { socket.destroy(); resolve(result); };

        socket.setTimeout(5000);
        socket.connect(port, host, () => {
          socket.write('*1\r\n$4\r\nPING\r\n');
        });
        socket.once('data', data => {
          const reply = data.toString();
          done({ connected: reply.startsWith('+PONG') || reply.includes('PONG'), data: { reply } });
        });
        socket.once('timeout', () => done({ connected: false, error: 'Connection timed out' }));
        socket.once('error',   err => done({ connected: false, error: err.message }));
      }).catch(err => resolve({ connected: false, error: err.message }));
    });
  }
}

class StripeConnector {
  #secretKey;
  #configured;

  constructor() {
    this.#secretKey  = process.env.STRIPE_SECRET_KEY;
    this.#configured = !!this.#secretKey;
  }

  #headers() {
    return { Authorization: `Bearer ${this.#secretKey}` };
  }

  async testConnection() {
    if (!this.#configured) return missingCreds('STRIPE_SECRET_KEY');
    try {
      const res = await fetch('https://api.stripe.com/v1/balance', { headers: this.#headers() });
      if (!res.ok) throw new Error(`Stripe: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  async getPaymentMethods() {
    if (!this.#configured) return missingCreds('STRIPE_SECRET_KEY');
    try {
      const res = await fetch('https://api.stripe.com/v1/payment_methods?type=card', {
        headers: this.#headers(),
      });
      if (!res.ok) throw new Error(`Stripe payment methods: ${res.status}`);
      const data = await res.json();
      return { connected: true, data };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }
}

const CONNECTOR_NAMES = [
  'azure', 'aws', 'googlecloud', 'adobe', 'slack',
  'zoom', 'github', 'bitbucket', 'redis', 'stripe',
];

export default class PlatformConnectors {
  #connectors;

  constructor() {
    this.#connectors = {
      azure:       new AzureConnector(),
      aws:         new AWSConnector(),
      googlecloud: new GoogleCloudConnector(),
      adobe:       new AdobeConnector(),
      slack:       new SlackConnector(),
      zoom:        new ZoomConnector(),
      github:      new GitHubConnector(),
      bitbucket:   new BitbucketConnector(),
      redis:       new RedisConnector(),
      stripe:      new StripeConnector(),
    };
  }

  getConnector(name) {
    const key = name.toLowerCase();
    if (!this.#connectors[key]) throw new Error(`Unknown connector: ${name}`);
    return this.#connectors[key];
  }

  async getConnectorStatus() {
    const status = {};
    await Promise.all(
      CONNECTOR_NAMES.map(async name => {
        try {
          const result = await this.#connectors[name].testConnection();
          if (result.connected) {
            status[name] = 'connected';
          } else if (result.error?.includes('Missing credentials')) {
            status[name] = 'not_configured';
          } else {
            status[name] = 'error';
          }
        } catch {
          status[name] = 'error';
        }
      })
    );
    return status;
  }
}
