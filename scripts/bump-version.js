import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const path = join(process.cwd(), 'app.json');
const config = JSON.parse(readFileSync(path, 'utf8'));

const runNumber = Number(process.env.GITHUB_RUN_NUMBER || 0);
const semanticVersion = runNumber > 0
  ? `0.${runNumber}.0`
  : `1.${config.expo.android.versionCode || 0}.0`;

config.expo.version = semanticVersion;
config.expo.android.versionCode = 2000 + runNumber;

writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
console.log(`versionCode ${config.expo.android.versionCode} (version ${semanticVersion})`);