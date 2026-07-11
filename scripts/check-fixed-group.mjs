// Changesets fixed-group repo check (M0-T06; docs/12, section "Lockstep
// policy"): the fixed group must enumerate the thirteen lockstep package
// names explicitly (no globs, no negation patterns) and must equal the set
// of workspace packages minus @rulvar/compat.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url).pathname;

const config = JSON.parse(readFileSync(join(ROOT, '.changeset', 'config.json'), 'utf8'));

const workspaceNames = readdirSync(join(ROOT, 'packages'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'packages', d.name, 'package.json'), 'utf8'));
    return pkg.name;
  });

const expected = workspaceNames.filter((n) => n !== '@rulvar/compat').sort();

const fixed = config.fixed;
if (!Array.isArray(fixed) || fixed.length !== 1 || !Array.isArray(fixed[0])) {
  console.error('changesets config must declare exactly one fixed group');
  process.exit(1);
}

const group = fixed[0];
const withPattern = group.filter((n) => n.includes('*') || n.startsWith('!'));
if (withPattern.length > 0) {
  console.error(
    `fixed group must enumerate names explicitly; found patterns: ${withPattern.join(', ')}`,
  );
  process.exit(1);
}

const actual = [...group].sort();
const missing = expected.filter((n) => !actual.includes(n));
const extra = actual.filter((n) => !expected.includes(n));

if (missing.length > 0 || extra.length > 0) {
  if (missing.length > 0) {
    console.error(`fixed group is missing workspace packages: ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    console.error(`fixed group contains unknown or exempt packages: ${extra.join(', ')}`);
  }
  process.exit(1);
}

console.log(`fixed group check passed: ${actual.length} lockstep packages, @rulvar/compat exempt`);
