#!/usr/bin/env node
import { createInterface } from 'readline/promises';
import { writeFile, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function prompt(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function exchangeToken(
  clientId: string,
  clientSecret: string,
  code: string
): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Failed to exchange token: ${error.message || response.statusText}`);
  }

  return response.json();
}

async function loadExistingEnv(): Promise<Record<string, string>> {
  try {
    const content = await readFile(envPath, 'utf-8');
    const env: Record<string, string> = {};

    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return env;
  } catch {
    return {};
  }
}

async function writeEnvFile(env: Record<string, string>): Promise<void> {
  const lines = [
    '# Strava API Credentials',
    '# Get these from: https://www.strava.com/settings/api',
    `STRAVA_CLIENT_ID=${env.STRAVA_CLIENT_ID}`,
    `STRAVA_CLIENT_SECRET=${env.STRAVA_CLIENT_SECRET}`,
    '',
    '# OAuth Tokens',
    '# These are obtained after completing the OAuth flow',
    `STRAVA_ACCESS_TOKEN=${env.STRAVA_ACCESS_TOKEN}`,
    `STRAVA_REFRESH_TOKEN=${env.STRAVA_REFRESH_TOKEN}`,
    `STRAVA_EXPIRES_AT=${env.STRAVA_EXPIRES_AT}`,
    '',
    '# OAuth Scope (for reference)',
    `# STRAVA_SCOPE=${env.STRAVA_SCOPE || 'read,activity:read_all,profile:read_all'}`,
    '',
  ];

  await writeFile(envPath, lines.join('\n'), 'utf-8');
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Strava MCP Server - OAuth Setup');
  console.log('='.repeat(60));
  console.log('');

  // Load existing environment
  const existingEnv = await loadExistingEnv();

  // Get Client ID
  let clientId = existingEnv.STRAVA_CLIENT_ID || '';
  if (!clientId) {
    console.log('First, you need to create a Strava application:');
    console.log('1. Visit: https://www.strava.com/settings/api');
    console.log('2. Create a new application');
    console.log('3. For "Authorization Callback Domain" use: localhost');
    console.log('');
    clientId = await prompt('Enter your Strava Client ID: ');
  } else {
    console.log(`Using existing Client ID: ${clientId}`);
    const useExisting = await prompt('Keep this Client ID? (y/n): ');
    if (useExisting.toLowerCase() !== 'y') {
      clientId = await prompt('Enter your Strava Client ID: ');
    }
  }

  // Get Client Secret
  let clientSecret = existingEnv.STRAVA_CLIENT_SECRET || '';
  if (!clientSecret) {
    clientSecret = await prompt('Enter your Strava Client Secret: ');
  } else {
    console.log('Using existing Client Secret: ********');
    const useExisting = await prompt('Keep this Client Secret? (y/n): ');
    if (useExisting.toLowerCase() !== 'y') {
      clientSecret = await prompt('Enter your Strava Client Secret: ');
    }
  }

  // Get scope selection
  console.log('');
  console.log('='.repeat(60));
  console.log('Permission Scope Selection');
  console.log('='.repeat(60));
  console.log('');
  console.log('Choose the permissions you want to grant:');
  console.log('');
  console.log('1. Minimal (recommended for troubleshooting)');
  console.log('   - Basic read access only');
  console.log('   Scope: read,activity:read');
  console.log('');
  console.log('2. Read-only (full)');
  console.log('   - View all activities, athlete data, routes, segments, clubs, gear');
  console.log('   - Cannot create, update, or delete activities');
  console.log('   Scope: read,activity:read_all,profile:read_all');
  console.log('');
  console.log('3. Read + Write');
  console.log('   - Everything in Read-only');
  console.log('   - Can create, update, and delete activities');
  console.log('   Scope: read,activity:read_all,activity:write,profile:read_all');
  console.log('');

  const scopeChoice = await prompt('Enter your choice (1, 2, or 3): ');

  let scope: string;
  if (scopeChoice === '1') {
    scope = 'read,activity:read';
    console.log('✓ Selected: Minimal permissions');
  } else if (scopeChoice === '2') {
    scope = 'read,activity:read_all,profile:read_all';
    console.log('✓ Selected: Read-only (full) permissions');
  } else if (scopeChoice === '3') {
    scope = 'read,activity:read_all,activity:write,profile:read_all';
    console.log('✓ Selected: Read + Write permissions');
  } else {
    console.log('Invalid choice. Defaulting to Minimal permissions.');
    scope = 'read,activity:read';
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('OAuth Authorization');
  console.log('='.repeat(60));
  console.log('');
  console.log('IMPORTANT: Make sure your Strava app Authorization Callback Domain');
  console.log('matches one of the following:');
  console.log('  - localhost');
  console.log('  - localhost:8080');
  console.log('');
  console.log('You can verify this at: https://www.strava.com/settings/api');
  console.log('');

  // Generate authorization URL - try without protocol first
  const redirectUri = 'http://localhost';
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&approval_prompt=auto`;

  console.log('Step 1: Visit this URL in your browser:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('Step 2: Authorize the application');
  console.log('');
  console.log('Step 3: You will be redirected to a URL like:');
  console.log('http://localhost/?state=&code=XXXXXX&scope=...');
  console.log('');
  console.log('NOTE: The page will show "This site can\'t be reached" - that\'s OK!');
  console.log('Just copy the URL from your browser address bar.');
  console.log('');

  const code = await prompt('Paste the authorization code from the URL (the part after "code="): ');

  console.log('');
  console.log('Exchanging authorization code for tokens...');

  try {
    const tokens = await exchangeToken(clientId, clientSecret, code);

    console.log('');
    console.log('✓ Successfully obtained tokens!');
    console.log('');

    // Save to .env file
    await writeEnvFile({
      STRAVA_CLIENT_ID: clientId,
      STRAVA_CLIENT_SECRET: clientSecret,
      STRAVA_ACCESS_TOKEN: tokens.access_token,
      STRAVA_REFRESH_TOKEN: tokens.refresh_token,
      STRAVA_EXPIRES_AT: tokens.expires_at.toString(),
      STRAVA_SCOPE: scope,
    });

    console.log(`✓ Credentials saved to: ${envPath}`);
    console.log('');
    console.log('='.repeat(60));
    console.log('Setup Complete!');
    console.log('='.repeat(60));
    console.log('');
    console.log('You can now:');
    console.log('1. Build the server: npm run build');
    console.log('2. Configure it in Claude Desktop');
    console.log('');
    console.log('See README.md for Claude Desktop configuration instructions.');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('✗ Failed to exchange token:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error('Please check:');
    console.error('- Your Client ID and Secret are correct');
    console.error('- The authorization code is valid (they expire quickly!)');
    console.error('- You copied the entire code from the URL');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
