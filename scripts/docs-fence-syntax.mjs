// Docs fence syntax gate (v1.16.2 review P4-1): every authored ts/js
// fence in the documentation must parse as a standalone TypeScript or
// JavaScript module, so a copy/paste example is never a syntactically
// incomplete fragment. The one non-parsing fence the review found (a
// bare `defaults: { ... }` object body, which the parser reads as a
// label followed by a block and then an illegal comma) is exactly what
// this catches.
//
// Syntax only: ts.transpileModule reports parse and grammar diagnostics
// without type resolution, so a fence may freely reference undeclared
// symbols (createEngine, anthropic()) and still pass as long as it is a
// well-formed module. Fences in other languages (text, bash, json,
// mermaid) are ignored, and the scope mirrors docs-lint: the generated
// api tree, the build output, and the aggregated changelog and mirrored
// CONTRIBUTING copy are excluded (they are linted at their source).
//
// Typecheck of copy/paste-runnable examples is a separate, stricter
// pass and is intentionally NOT done here: this gate is the syntactic
// floor every fence must clear.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const EXCLUDED_DIRS = new Set(['api', 'node_modules', '.vitepress']);
const EXCLUDED_FILES = new Set(
  ['contributing/index.md', 'reference/changelog.md'].map((p) => p.split('/').join(sep)),
);

// First token of the fence info string, lowercased.
const FILENAME_FOR = new Map([
  ['ts', 'snippet.ts'],
  ['typescript', 'snippet.ts'],
  ['tsx', 'snippet.tsx'],
  ['js', 'snippet.js'],
  ['javascript', 'snippet.js'],
  ['mjs', 'snippet.js'],
  ['cjs', 'snippet.js'],
  ['jsx', 'snippet.jsx'],
]);

const COMPILER_OPTIONS = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ESNext,
  jsx: ts.JsxEmit.Preserve,
  allowJs: true,
};

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
let checked = 0;

/** @param {string} file @param {number} line @param {string} message */
function fail(file, line, message) {
  failures++;
  console.error(`${file.replace(ROOT, '')}:${line}: ${message}`);
}

for (const file of collectFiles()) {
  const lines = readFileSync(file, 'utf8').split('\n');
  /** @type {string | null} */
  let lang = null;
  let startLine = 0;
  /** @type {string[]} */
  let body = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (lang === null) {
      const open = line.match(/^\s*(?:```|~~~)\s*(\S+)/u);
      if (open) {
        // The info string can carry VitePress attributes after the
        // language token (```ts twoslash, ```ts:line-numbers, ```ts {1}).
        lang = open[1].split(/[:\s{]/u)[0].toLowerCase();
        startLine = i + 1;
        body = [];
      } else if (/^\s*(?:```|~~~)\s*$/u.test(line)) {
        // A bare opening fence (no language): still a fence to skip.
        lang = '';
        startLine = i + 1;
        body = [];
      }
    } else if (/^\s*(?:```|~~~)\s*$/u.test(line)) {
      const fileName = FILENAME_FOR.get(lang);
      if (fileName !== undefined) {
        checked++;
        const code = body.join('\n');
        const result = ts.transpileModule(code, {
          reportDiagnostics: true,
          compilerOptions: COMPILER_OPTIONS,
          fileName,
        });
        for (const diagnostic of result.diagnostics) {
          if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
          // body[0] sits at file line startLine + 1; a diagnostic on
          // body line index k reports at startLine + 1 + k.
          const bodyLineIndex =
            diagnostic.start === undefined
              ? 0
              : code.slice(0, diagnostic.start).split('\n').length - 1;
          fail(
            file,
            startLine + 1 + bodyLineIndex,
            `fence does not parse as standalone ${lang}: ${message}`,
          );
        }
      }
      lang = null;
    } else {
      body.push(line);
    }
  }
}

if (failures > 0) {
  console.error(`\ndocs fence syntax gate failed with ${failures} problem(s)`);
  process.exit(1);
}
console.log(`docs fence syntax gate passed (${checked} ts/js fences parse)`);
