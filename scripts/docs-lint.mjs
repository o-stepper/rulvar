// Docs lint: enforces the documentation conventions on the public
// documentation site under docs/ plus the root-level Markdown, following
// the conventions the retired internal spec set established (ASCII hyphen
// only, no emojis, one H1, scoped install names).
//
// Checks, per markdown file in scope:
//   1. Forbidden dash codepoints: U+2014 em dash, U+2013 en dash, and the
//      look-alikes U+2010, U+2011, U+2012, U+2212. ASCII hyphen only.
//   2. No emojis (Extended_Pictographic) and no emoji shortcodes.
//   3. Exactly one H1 outside fenced code blocks; pages whose frontmatter
//      declares `layout: home` render their heading from frontmatter and
//      are expected to have zero H1s.
//   4. Install commands never reference the bare package name `rulvar`
//      (npm install / pnpm add / yarn add / npx).
//
// Scope: every hand-written .md under docs/, recursively. Generated or
// mirrored trees are excluded: docs/api (TypeDoc output), docs/node_modules,
// docs/.vitepress (build output and cache), docs/contributing/index.md
// (synced from /CONTRIBUTING.md, which is linted directly), and
// docs/reference/changelog.md (aggregated from packages/*/CHANGELOG.md).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url).pathname;

const FORBIDDEN_DASHES = /[‐‑‒–—−]/u;
const EMOJI = /\p{Extended_Pictographic}/u;
const BARE_INSTALL = /\b(?:npm\s+(?:install|i|add)|pnpm\s+add|yarn\s+add|npx)\s+rulvar(?![\w/@-])/u;
/**
 * VitePress compiles every page as a Vue template, and only FENCED code
 * blocks are auto-wrapped in v-pre. A `{{ ... }}` in prose, or in an
 * INLINE code span (backticks are not enough), is evaluated as a Vue
 * expression at build time, so a page that merely quotes a GitHub Actions
 * expression crashes the site build with "Cannot read properties of
 * undefined". The crash names a compiled temp file and not the source, so
 * catch it here, at the line, instead.
 */
const VUE_INTERPOLATION = /\{\{/u;

const EXCLUDED_DIRS = new Set(['api', 'node_modules', '.vitepress']);
const EXCLUDED_FILES = new Set(
  ['contributing/index.md', 'reference/changelog.md'].map((p) => p.split('/').join(sep)),
);

/** @param {string} dir @param {string} docsRoot @returns {string[]} */
function walk(dir, docsRoot) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === docsRoot && EXCLUDED_DIRS.has(entry.name)) continue;
      out.push(...walk(full, docsRoot));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    if (EXCLUDED_FILES.has(relative(docsRoot, full))) continue;
    out.push(full);
  }
  return out;
}

/** @returns {string[]} markdown files under docs/ plus the root-level docs */
function collectFiles() {
  const docsRoot = join(ROOT, 'docs');
  const files = walk(docsRoot, docsRoot);
  for (const rootDoc of ['README.md', 'CONTRIBUTING.md']) {
    try {
      readFileSync(join(ROOT, rootDoc));
      files.push(join(ROOT, rootDoc));
    } catch {
      // optional at bootstrap time
    }
  }
  return files;
}

let failures = 0;

/** @param {string} file @param {number} line @param {string} message */
function fail(file, line, message) {
  failures++;
  console.error(`${file.replace(ROOT, '')}:${line}: ${message}`);
}

for (const file of collectFiles()) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  let inFence = false;
  let h1Count = 0;

  // VitePress home layout pages carry their heading in frontmatter.
  const frontmatterEnd = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  const frontmatter = frontmatterEnd > 0 ? lines.slice(1, frontmatterEnd) : [];
  const isHomeLayout = frontmatter.some((l) => /^layout:\s*home\s*$/.test(l));

  lines.forEach((line, i) => {
    const n = i + 1;
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    const dash = line.match(FORBIDDEN_DASHES);
    if (dash) {
      const code = dash[0].codePointAt(0)?.toString(16).toUpperCase();
      fail(file, n, `forbidden dash character U+${code}; use the ASCII hyphen`);
    }
    if (EMOJI.test(line)) {
      fail(file, n, 'emoji characters are forbidden in the documentation set');
    }
    if (!inFence && VUE_INTERPOLATION.test(line)) {
      fail(
        file,
        n,
        'VitePress evaluates {{ ... }} as a Vue expression outside a fenced code block ' +
          '(an inline code span is NOT enough, and the build error names a temp file, not this ' +
          'line); move it into a fenced block',
      );
    }
    if (!inFence && /^# /.test(line)) {
      h1Count++;
    }
    const install = line.match(BARE_INSTALL);
    if (install) {
      // A quoted or backticked occurrence is a deliberate mention (for
      // example a page quoting the squatted-name hazard), not an
      // install instruction.
      const before = line[install.index - 1];
      if (before !== '"' && before !== '`' && before !== "'") {
        fail(file, n, 'install commands must use @rulvar/<name>, never the bare name');
      }
    }
  });

  const expectedH1 = isHomeLayout ? 0 : 1;
  if (h1Count !== expectedH1) {
    fail(file, 1, `expected exactly ${expectedH1} H1(s), found ${h1Count}`);
  }
}

if (failures > 0) {
  console.error(`\ndocs lint failed with ${failures} problem(s)`);
  process.exit(1);
}
console.log('docs lint passed');
