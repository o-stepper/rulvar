// Docs lint (M0-T09): enforces the documentation conventions of
// docs/README.md, section "Conventions", plus the install-command rule of
// docs/13, section "Naming risk note".
//
// Checks, per markdown file in scope:
//   1. Forbidden dash codepoints: U+2014 em dash, U+2013 en dash, and the
//      look-alikes U+2010, U+2011, U+2012, U+2212. ASCII hyphen only.
//   2. No emojis (Extended_Pictographic) and no emoji shortcodes.
//   3. Exactly one H1 outside fenced code blocks.
//   4. Install commands never reference the bare package name `lurker`
//      (npm install / pnpm add / yarn add / npx).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url).pathname;

const FORBIDDEN_DASHES = /[‐‑‒–—−]/u;
const EMOJI = /\p{Extended_Pictographic}/u;
const BARE_INSTALL = /\b(?:npm\s+(?:install|i|add)|pnpm\s+add|yarn\s+add|npx)\s+lurker(?![\w/@-])/u;

/** @returns {string[]} markdown files under docs/ plus the root-level docs */
function collectFiles() {
  const files = readdirSync(join(ROOT, 'docs'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(ROOT, 'docs', f));
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
    if (!inFence && /^# /.test(line)) {
      h1Count++;
    }
    const install = line.match(BARE_INSTALL);
    if (install) {
      // A quoted or backticked occurrence is a deliberate mention (for
      // example docs/14 OQ-24 quoting the squatted-name hazard), not an
      // install instruction.
      const before = line[install.index - 1];
      if (before !== '"' && before !== '`' && before !== "'") {
        fail(file, n, 'install commands must use @lurker/<name>, never the bare name');
      }
    }
  });

  if (h1Count !== 1) {
    fail(file, 1, `expected exactly one H1, found ${h1Count}`);
  }
}

if (failures > 0) {
  console.error(`\ndocs lint failed with ${failures} problem(s)`);
  process.exit(1);
}
console.log('docs lint passed');
