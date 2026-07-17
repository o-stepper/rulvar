// Compat artifact immutability gate (the v1.16.1 review P3): one semver
// must never correspond to two different artifacts. @rulvar/compat is
// the sole lockstep exemption and releases only when a frozen profile
// moves in, so between its own releases a fresh `pnpm pack` from source
// must reproduce the published npm artifact byte for byte. v1.16.1
// shipped a source tree whose pack of the unchanged 0.1.0 differed from
// the registry in three ways (a workspace:* dependency rewritten to the
// current core, a README the artifact never had, a doc comment swept
// after publish), which this gate now fails.
//
// Modes:
//   node scripts/compat-immutability.mjs             pack packages/compat and
//       compare against the committed canonical manifest (offline; CI).
//   node scripts/compat-immutability.mjs --registry  additionally download
//       the published tarball and verify the committed manifest matches the
//       registry itself (release workflow; needs network).
//   node scripts/compat-immutability.mjs --update    regenerate the manifest
//       FROM the registry artifact after a deliberate compat release.
//
// Comparison rules: every file except package.json byte-hashes (sha256)
// against the manifest; package.json compares as sorted-key JSON so a
// future pack serializer may reorder keys but never change content.
// When the source version differs from the manifest version, the gate
// passes vacuously: that is a deliberate new compat release, and
// --update re-freezes the manifest once it is published.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const MANIFEST_PATH = new URL('./compat-published-manifest.json', import.meta.url);
const COMPAT_DIR = join(process.cwd(), 'packages', 'compat');
const pnpmCmd = process.env.PNPM_CMD ?? 'pnpm';
const [pnpmBin, ...pnpmPre] = pnpmCmd.split(' ');
const mode = process.argv.includes('--update')
  ? 'update'
  : process.argv.includes('--registry')
    ? 'registry'
    : 'offline';

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function sortDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortDeep(value[key])]),
    );
  }
  return value;
}

function listFiles(root, dir = root) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      files.push(...listFiles(root, path));
    } else {
      files.push(relative(root, path));
    }
  }
  return files.sort();
}

function extractTarball(tgzPath) {
  const dir = mkdtempSync(join(tmpdir(), 'rulvar-compat-gate-'));
  execFileSync('tar', ['-xzf', tgzPath, '-C', dir]);
  return join(dir, 'package');
}

function describeArtifact(packageRoot) {
  const files = listFiles(packageRoot);
  const hashes = {};
  for (const file of files) {
    if (file !== 'package.json') {
      hashes[file] = sha256(readFileSync(join(packageRoot, file)));
    }
  }
  const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  return { files, hashes, packageJson };
}

function compare(label, actual, manifest) {
  const problems = [];
  const expectedFiles = [...Object.keys(manifest.files), 'package.json'].sort();
  if (JSON.stringify(actual.files) !== JSON.stringify(expectedFiles)) {
    problems.push(
      `file list differs\n  expected: ${expectedFiles.join(', ')}\n  actual:   ${actual.files.join(', ')}`,
    );
  }
  for (const [file, expectedHash] of Object.entries(manifest.files)) {
    const actualHash = actual.hashes[file];
    if (actualHash !== undefined && actualHash !== expectedHash) {
      problems.push(`${file} content differs (sha256 ${actualHash} != ${expectedHash})`);
    }
  }
  const actualJson = JSON.stringify(sortDeep(actual.packageJson), null, 2);
  const expectedJson = JSON.stringify(sortDeep(manifest.packageJson), null, 2);
  if (actualJson !== expectedJson) {
    const diff = actualJson
      .split('\n')
      .filter((line, i) => line !== expectedJson.split('\n')[i])
      .slice(0, 10);
    problems.push(`package.json differs; first divergent lines:\n  ${diff.join('\n  ')}`);
  }
  if (problems.length > 0) {
    console.error(`compat immutability gate FAILED for the ${label} artifact:`);
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    console.error(
      '\nA published compat version is immutable: bump the compat version (a real ' +
        'new release) or revert the bytes so `pnpm pack` reproduces the published ' +
        'artifact. After a deliberate release, re-freeze with --update.',
    );
    process.exit(1);
  }
}

async function fetchRegistryArtifact(version) {
  const packument = await (await fetch('https://registry.npmjs.org/@rulvar/compat')).json();
  const tarballUrl = packument.versions?.[version]?.dist?.tarball;
  if (tarballUrl === undefined) {
    console.error(`@rulvar/compat@${version} is not on the registry`);
    process.exit(1);
  }
  const bytes = Buffer.from(await (await fetch(tarballUrl)).arrayBuffer());
  const tgz = join(mkdtempSync(join(tmpdir(), 'rulvar-compat-reg-')), 'compat.tgz');
  writeFileSync(tgz, bytes);
  return describeArtifact(extractTarball(tgz));
}

const sourceVersion = JSON.parse(readFileSync(join(COMPAT_DIR, 'package.json'), 'utf8')).version;

if (mode === 'update') {
  const artifact = await fetchRegistryArtifact(sourceVersion);
  const manifest = {
    comment:
      'Canonical manifest of the published @rulvar/compat artifact. Regenerated only ' +
      'via `node scripts/compat-immutability.mjs --update` after a deliberate compat ' +
      'release; the gate compares every pack of an unchanged version against it.',
    package: '@rulvar/compat',
    version: sourceVersion,
    verifiedAgainstRegistry: new Date().toISOString().slice(0, 10),
    files: artifact.hashes,
    packageJson: sortDeep(artifact.packageJson),
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`compat manifest re-frozen from the registry at ${sourceVersion}`);
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

if (sourceVersion !== manifest.version) {
  console.log(
    `compat version bumped (${manifest.version} -> ${sourceVersion}): a new compat ` +
      'release is in flight, the immutability gate passes vacuously. Publish, then ' +
      'run `node scripts/compat-immutability.mjs --update`.',
  );
  process.exit(0);
}

const packDir = mkdtempSync(join(tmpdir(), 'rulvar-compat-pack-'));
execFileSync(pnpmBin, [...pnpmPre, 'pack', '--pack-destination', packDir], {
  cwd: COMPAT_DIR,
  stdio: ['ignore', 'ignore', 'inherit'],
});
const tgz = readdirSync(packDir).find((name) => name.endsWith('.tgz'));
if (tgz === undefined) {
  console.error('pnpm pack produced no tarball');
  process.exit(1);
}
compare('freshly packed', describeArtifact(extractTarball(join(packDir, tgz))), manifest);
console.log(`compat immutability gate passed: pack of ${sourceVersion} matches the manifest`);

if (mode === 'registry') {
  compare('registry', await fetchRegistryArtifact(manifest.version), manifest);
  console.log('compat immutability gate passed: the committed manifest matches the registry');
}
