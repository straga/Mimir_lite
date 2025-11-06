#!/usr/bin/env node
// Cross-platform build helper: reads package.json version and runs docker-compose with VERSION in env.
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { URL } from 'url';

try {
  const pkgJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  const version = pkgJson.version || '';
  console.log(`Building docker image with VERSION=${version}`);

  const env = { ...process.env, VERSION: version };

  const result = spawnSync('docker-compose', ['build', 'mcp-server'], { stdio: 'inherit', env });

  if (result.error) {
    console.error('Failed to run docker-compose:', result.error);
    process.exit(result.status || 1);
  }

  process.exit(result.status ?? 0);
} catch (err) {
  console.error('Error preparing docker build:', err);
  process.exit(1);
}
