// Docs build output size budget (the v1.22.0 review P3-6): the API
// sidebar used to be rendered whole into every generated page, and the
// build silently grew to 851 MB of HTML without any gate noticing.
// After the path-keyed sidebar split, this budget keeps the four
// numbers that matter visible on every docs build and fails only on a
// real regression (more than 10 percent over the committed baseline):
// total uncompressed HTML bytes, total gzip HTML bytes, the p95 single
// page, and the maximum single page. The search index chunk has its own
// budget (docs-search-budget.mjs) and stays out of these sums.
//
//   node scripts/docs-size-budget.mjs           check (after docs:build)
//   node scripts/docs-size-budget.mjs --update  refreeze the baseline
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BASELINE_PATH = new URL('./docs-size-budget.json', import.meta.url);
const REGRESSION_FACTOR = 1.1;

const dist = join(process.cwd(), 'docs', '.vitepress', 'dist');
if (!existsSync(dist)) {
  console.error(`docs dist not found at ${dist}; run pnpm docs:build first`);
  process.exit(1);
}

/** Recursive *.html collection; the dist stays flat enough to walk fully. */
function collectHtml(dir, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHtml(absolute, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(absolute);
    }
  }
  return files;
}

const files = collectHtml(dist, []);
if (files.length === 0) {
  console.error(`no HTML files under ${dist}; did the VitePress build change layout?`);
  process.exit(1);
}
const sizes = [];
let totalRawBytes = 0;
let totalGzipBytes = 0;
for (const file of files) {
  const raw = statSync(file).size;
  sizes.push(raw);
  totalRawBytes += raw;
  totalGzipBytes += gzipSync(readFileSync(file)).length;
}
sizes.sort((a, b) => a - b);
const p95PageBytes = sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * 0.95))];
const maxPageBytes = sizes[sizes.length - 1];

const measured = {
  htmlFiles: files.length,
  totalRawBytes,
  totalGzipBytes,
  p95PageBytes,
  maxPageBytes,
};
console.log(
  `[docs-size-budget] ${String(files.length)} HTML pages: ` +
    `total raw ${String(totalRawBytes)} bytes, total gzip ${String(totalGzipBytes)} bytes, ` +
    `p95 page ${String(p95PageBytes)} bytes, max page ${String(maxPageBytes)} bytes`,
);

if (process.argv.includes('--update')) {
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        comment:
          'Committed size baseline for the whole docs HTML output. ' +
          'scripts/docs-size-budget.mjs fails a docs build whose total raw, total gzip, ' +
          'p95 page, or max page exceeds it by more than 10 percent; refreeze deliberately ' +
          'with --update after adding content.',
        ...measured,
        recordedAt: new Date().toISOString().slice(0, 10),
      },
      null,
      2,
    )}\n`,
  );
  console.log('[docs-size-budget] baseline refrozen');
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error('no committed baseline; record one with --update and commit it');
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
let failed = false;
for (const key of ['totalRawBytes', 'totalGzipBytes', 'p95PageBytes', 'maxPageBytes']) {
  const limit = Math.round(baseline[key] * REGRESSION_FACTOR);
  if (measured[key] > limit) {
    console.error(
      `[docs-size-budget] REGRESSION: ${key} ${String(measured[key])} exceeds ` +
        `${String(limit)} (baseline ${String(baseline[key])} plus 10 percent). ` +
        'If the growth is deliberate, refreeze with --update and commit the diff.',
    );
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
