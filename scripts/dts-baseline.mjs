// Rolled-up .d.ts baseline for the SPI drift gate (M0 bootstrap checklist
// item 16; docs/13, section "CI workflow spec" step 6): copies every
// package's built dist/index.d.ts into the committed dts-rollup/ directory.
// CI rebuilds and re-runs this script; a dirty dts-rollup/ tree fails CI,
// forcing the public-surface diff into the PR for review.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'dts-rollup');

mkdirSync(OUT, { recursive: true });

let copied = 0;
let missing = [];
for (const dirent of readdirSync(join(ROOT, 'packages'), { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue;
  const dts = join(ROOT, 'packages', dirent.name, 'dist', 'index.d.ts');
  if (!existsSync(dts)) {
    missing.push(dirent.name);
    continue;
  }
  copyFileSync(dts, join(OUT, `${dirent.name}.d.ts`));
  copied++;
}

if (missing.length > 0) {
  console.error(
    `dts-baseline: missing dist/index.d.ts for: ${missing.join(', ')} (run the build first)`,
  );
  process.exit(1);
}
console.log(`dts-baseline: copied ${copied} rollups into dts-rollup/`);
