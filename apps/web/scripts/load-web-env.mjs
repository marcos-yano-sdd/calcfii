import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = existsSync(resolve(process.cwd(), '.env'))
  ? resolve(process.cwd(), '.env')
  : resolve(process.cwd(), '.env.example');

function readEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

const env = readEnv(envPath);
const outputDir = resolve(process.cwd(), 'src/assets');
mkdirSync(outputDir, { recursive: true });

writeFileSync(
  resolve(outputDir, 'app-config.json'),
  `${JSON.stringify(
    {
      apiBaseUrl: env.NG_APP_API_BASE_URL ?? 'http://localhost:3000',
      clerkPublishableKey: env.NG_APP_CLERK_PUBLISHABLE_KEY ?? '',
    },
    null,
    2,
  )}\n`,
);
