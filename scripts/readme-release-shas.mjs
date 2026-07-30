// README release-table SHA reachability gate (RV807, the twelfth
// experiment's validation): every squash SHA the Build Week table cites
// must name a commit that is an ancestor of HEAD. The v1.109.0 row
// carried `4ae268e`, an abbreviation contained by NO branch of the
// repository, for eleven releases: release history pointing at an
// unreachable object is a provenance lie the eye cannot catch, so the
// check is a CI fact. The gate needs full history: a shallow checkout
// cannot decide ancestry, so it is refused loudly instead of reporting
// false negatives (the CI job checks out with fetch-depth 0).
//
// Usage: node scripts/readme-release-shas.mjs  (from anywhere inside
// the repository; the README is read at the repository root).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * The SHAs of the release-table rows, in order, deduplicated. A row is
 * `| vN.N.N | <sha> (#PR): summary | vN.N.N |`; prose mentioning a SHA
 * is never matched.
 * @param {string} markdown @returns {string[]}
 */
export function parseReleaseShas(markdown) {
  const shas = [];
  const seen = new Set();
  for (const line of markdown.split('\n')) {
    const match = /^\|\s*v\d+\.\d+\.\d+\S*\s+\|\s*([0-9a-f]{7,40})\s+\(#\d+\):/.exec(line);
    if (match !== null && !seen.has(match[1])) {
      seen.add(match[1]);
      shas.push(match[1]);
    }
  }
  return shas;
}

function git(...args) {
  return spawnSync('git', args, { encoding: 'utf8' });
}

function main() {
  const toplevel = git('rev-parse', '--show-toplevel');
  if (toplevel.status !== 0) {
    console.error('[readme-release-shas] not inside a git repository');
    process.exit(1);
  }
  const root = toplevel.stdout.trim();
  if (git('rev-parse', '--is-shallow-repository').stdout.trim() === 'true') {
    console.error(
      '[readme-release-shas] the repository is shallow: ancestry cannot be decided. ' +
        'Fetch full history (actions/checkout with fetch-depth: 0).',
    );
    process.exit(1);
  }
  const shas = parseReleaseShas(readFileSync(join(root, 'README.md'), 'utf8'));
  if (shas.length === 0) {
    console.error(
      '[readme-release-shas] no release-table rows parsed from README.md: ' +
        'either the table moved or the parser broke, and a broken parser must not pass the gate.',
    );
    process.exit(1);
  }
  const violations = [];
  for (const sha of shas) {
    if (git('cat-file', '-e', `${sha}^{commit}`).status !== 0) {
      violations.push(`${sha}: no commit by that name in this repository`);
      continue;
    }
    if (git('merge-base', '--is-ancestor', sha, 'HEAD').status !== 0) {
      violations.push(
        `${sha}: not an ancestor of HEAD (the row cites unmerged or rewritten history)`,
      );
    }
  }
  if (violations.length > 0) {
    console.error(
      `[readme-release-shas] ${String(violations.length)} release-table SHA(s) fail reachability:`,
    );
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }
  console.log(
    `[readme-release-shas] all ${String(shas.length)} release-table SHAs are ancestors of HEAD`,
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
