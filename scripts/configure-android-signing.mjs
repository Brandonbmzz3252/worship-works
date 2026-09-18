import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const androidApp = join(root, 'android', 'app');
const keystorePath = join(androidApp, 'worshipworks-release.keystore');
const propsPath = join(androidApp, 'keystore.properties');
const gradlePath = join(androidApp, 'build.gradle');

const base64 = process.env.ANDROID_KEYSTORE_BASE64;
const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD;
const keyAlias = process.env.ANDROID_KEY_ALIAS;
const keyPassword = process.env.ANDROID_KEY_PASSWORD;

if (!base64 || !storePassword || !keyAlias || !keyPassword) {
  console.error(
    'Missing signing secrets. Set ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD.'
  );
  process.exit(1);
}

mkdirSync(androidApp, { recursive: true });
writeFileSync(keystorePath, Buffer.from(base64, 'base64'));
writeFileSync(
  propsPath,
  [
    'storeFile=worshipworks-release.keystore',
    `storePassword=${storePassword}`,
    `keyAlias=${keyAlias}`,
    `keyPassword=${keyPassword}`,
    '',
  ].join('\n')
);

if (!existsSync(gradlePath)) {
  console.error('android/app/build.gradle not found. Did expo prebuild run?');
  process.exit(1);
}

const gradle = readFileSync(gradlePath, 'utf8');

const releaseBlock = [
  '        release {',
  "            def keystorePropertiesFile = rootProject.file('app/keystore.properties')",
  '            def keystoreProperties = new Properties()',
  "            storeFile file('worshipworks-release.keystore')",
  '            if (keystorePropertiesFile.exists()) {',
  '                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))',
  "                storePassword keystoreProperties['storePassword']",
  "                keyAlias keystoreProperties['keyAlias']",
  "                keyPassword keystoreProperties['keyPassword']",
  '            }',
  '        }',
  '',
].join('\n');

function balancedCloseIndex(haystack, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < haystack.length; i++) {
    if (haystack[i] === '{') depth++;
    else if (haystack[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function injectReleaseConfig(body) {
  let idx = body.indexOf('signingConfigs {');
  let out = body;

  if (idx !== -1) {
    const insertAt = balancedCloseIndex(body, idx + 'signingConfigs {'.length - 1) - 1;
    if (insertAt < 0) return null;
    out = body.slice(0, insertAt) + '\n' + releaseBlock + body.slice(insertAt);
  } else {
    const btIdx = body.indexOf('buildTypes {');
    if (btIdx === -1) return null;
    const block = 'signingConfigs {\n' + releaseBlock + '    }\n\n';
    out = body.slice(0, btIdx) + block + body.slice(btIdx);
  }

  const btStart = out.indexOf('buildTypes {');
  if (btStart === -1) return null;
  const btEnd = balancedCloseIndex(out, btStart + 'buildTypes {'.length - 1);
  if (btEnd === -1) return null;

  const bt = out.slice(btStart, btEnd + 1);
  const releaseIdx = bt.indexOf('release {');
  if (releaseIdx === -1) return null;
  const releaseStart = bt.indexOf('release {', releaseIdx);
  const releaseEnd = balancedCloseIndex(bt, releaseStart + 'release {'.length - 1);
  if (releaseEnd === -1) return null;
  const release = bt.slice(releaseStart, releaseEnd + 1);
  const signed = release.replace(
    /signingConfig signingConfigs\.debug/g,
    'signingConfig signingConfigs.release'
  );

  return out.slice(0, btStart) + bt.slice(0, releaseStart) + signed + bt.slice(releaseEnd + 1) + out.slice(btEnd + 1);
}

const result = injectReleaseConfig(gradle);
if (!result || !result.includes('signingConfig signingConfigs.release')) {
  console.error('Could not wire release signingConfig.');
  process.exit(1);
}

writeFileSync(gradlePath, result);
console.log('Release signing configured.');