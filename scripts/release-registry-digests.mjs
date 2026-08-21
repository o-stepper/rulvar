// Registry tarball digests for the release notes (RV4306, P1.6): AFTER
// a publish, download every published package's tarball FROM THE
// REGISTRY by its `dist.tarball` URL, verify npm's own integrity field
// over the bytes, compute sha256 over exactly those bytes, and emit a
// mapping line per package. A local `npm pack` proves nothing about
// the registry artifact (the review's finding); these digests bind the
// commit, the tag, and the bytes consumers will actually install.
//
// The registry read path lags a burst publish, so each package polls
// (the release workflow's own pointer-poll precedent). Flags:
// --version X.Y.Z (the lockstep version), --out FILE (mapping lines),
// --commit SHA, --tag vX.Y.Z, --attempts N (default 12, 5s apart).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const argOf = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const version = argOf('version');
const out = argOf('out');
const commit = argOf('commit') ?? '';
const tag = argOf('tag') ?? '';
const attempts = Number(argOf('attempts') ?? '12');
if (version === undefined || out === undefined) {
  console.error(
    'usage: release-registry-digests --version X.Y.Z --out FILE [--commit SHA --tag vX]',
  );
  process.exit(2);
}

// Publishable names from packages/*/package.json, NEVER from a memory
// of the list (the rulvar release doctrine), plus the unscoped pointer.
const names = [];
for (const entry of readdirSync(join(root, 'packages'))) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(root, 'packages', entry, 'package.json'), 'utf8'));
  } catch {
    continue;
  }
  if (manifest.private === true) {
    continue;
  }
  // The compat package versions independently and republishes rarely;
  // digest only the lockstep set this release actually shipped.
  if (manifest.version === version) {
    names.push(manifest.name);
  }
}
names.push('rulvar');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const npmView = (name, field) => {
  try {
    return execFileSync('npm', ['view', `${name}@${version}`, field], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const lines = [];
for (const name of names) {
  let tarball = '';
  let integrity = '';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    tarball = npmView(name, 'dist.tarball');
    integrity = npmView(name, 'dist.integrity');
    if (tarball !== '') {
      break;
    }
    console.log(`[registry-digests] ${name}@${version} not visible yet (${attempt}/${attempts})`);
    await sleep(5000);
  }
  if (tarball === '') {
    console.error(`[registry-digests] ${name}@${version} never became visible on the registry`);
    process.exit(1);
  }
  const bytes = await fetch(tarball).then((response) => {
    if (!response.ok) {
      throw new Error(`GET ${tarball} answered ${String(response.status)}`);
    }
    return response.arrayBuffer();
  });
  const buffer = Buffer.from(bytes);
  // Verify npm's own integrity claim over the exact bytes fetched:
  // sri format sha512-BASE64.
  let integrityVerdict = 'unpublished-integrity';
  if (integrity.startsWith('sha512-')) {
    const digest = createHash('sha512').update(buffer).digest('base64');
    integrityVerdict = digest === integrity.slice('sha512-'.length) ? 'verified' : 'MISMATCH';
    if (integrityVerdict === 'MISMATCH') {
      console.error(`[registry-digests] ${name}@${version}: integrity MISMATCH against ${tarball}`);
      process.exit(1);
    }
  }
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  lines.push(
    `- ${name}@${version}: sha256 ${sha256} (registry tarball, integrity ${integrityVerdict}` +
      `${commit === '' ? '' : `, commit ${commit.slice(0, 12)}`}${tag === '' ? '' : `, tag ${tag}`})`,
  );
  console.log(`[registry-digests] ${name}@${version}: ${sha256}`);
}

writeFileSync(out, `${lines.join('\n')}\n`);
console.log(`[registry-digests] wrote ${String(lines.length)} digest line(s) to ${out}`);
