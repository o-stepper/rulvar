// Docs search-index size budget (the v1.16.1 review P4): raising
// chunkSizeWarningLimit silenced Rollup's advisory for the local search
// index, the one docs chunk that grows with content, which also hid any
// future growth. This budget makes growth visible instead: report the
// raw and gzip sizes on every docs build, fail only on a real
// regression (more than 10 percent over the committed baseline), and
// refreeze deliberately with --update after adding content or splitting
// the index. The chunk stays lazy (it loads on first search focus), so
// the budget is about transfer cost trend, not initial page load.
//
//   node scripts/docs-search-budget.mjs           check (after docs:build)
//   node scripts/docs-search-budget.mjs --update  refreeze the baseline
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BASELINE_PATH = new URL('./docs-search-budget.json', import.meta.url);
const REGRESSION_FACTOR = 1.1;

const chunksDir = join(process.cwd(), 'docs', '.vitepress', 'dist', 'assets', 'chunks');
if (!existsSync(chunksDir)) {
  console.error(`docs dist not found at ${chunksDir}; run pnpm docs:build first`);
  process.exit(1);
}
const searchChunks = readdirSync(chunksDir).filter(
  (file) => file.includes('localSearchIndex') && file.endsWith('.js'),
);
if (searchChunks.length === 0) {
  console.error(`no localSearchIndex chunk under ${chunksDir}; did VitePress rename it?`);
  process.exit(1);
}
let rawBytes = 0;
let gzipBytes = 0;
for (const file of searchChunks) {
  const content = readFileSync(join(chunksDir, file));
  rawBytes += content.length;
  gzipBytes += gzipSync(content).length;
}
console.log(
  `[docs-search-budget] ${String(searchChunks.length)} chunk(s): ` +
    `raw ${String(rawBytes)} bytes, gzip ${String(gzipBytes)} bytes`,
);

if (process.argv.includes('--update')) {
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        comment:
          'Committed size baseline for the docs local search index chunk. ' +
          'scripts/docs-search-budget.mjs fails a docs build that exceeds it by more ' +
          'than 10 percent; refreeze deliberately with --update.',
        rawBytes,
        gzipBytes,
        recordedAt: new Date().toISOString().slice(0, 10),
      },
      null,
      2,
    )}\n`,
  );
  console.log('[docs-search-budget] baseline refrozen');
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const problems = [];
if (rawBytes > baseline.rawBytes * REGRESSION_FACTOR) {
  problems.push(`raw ${String(rawBytes)} exceeds baseline ${String(baseline.rawBytes)} by >10%`);
}
if (gzipBytes > baseline.gzipBytes * REGRESSION_FACTOR) {
  problems.push(`gzip ${String(gzipBytes)} exceeds baseline ${String(baseline.gzipBytes)} by >10%`);
}
if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`[docs-search-budget] ${problem}`);
  }
  console.error(
    '[docs-search-budget] the search index outgrew its budget: split or trim the ' +
      'index, or refreeze consciously with --update and say why in the commit.',
  );
  process.exit(1);
}
if (rawBytes < baseline.rawBytes * 0.9) {
  console.log(
    '[docs-search-budget] the index shrank well under the baseline; consider ' +
      'refreezing with --update to keep the regression gate tight.',
  );
}
console.log('[docs-search-budget] within budget');
