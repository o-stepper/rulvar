#!/usr/bin/env node
/**
 * stamp-versions.mjs
 *
 * Single source of truth for the version numbers quoted in prose across
 * the committed documentation. The real versions live in the package
 * manifests (packages/core/package.json for the lockstep fixed group,
 * packages/compat/package.json for the independently versioned compat
 * package); this script rewrites every marked span to match:
 *
 *   <!-- version:lockstep -->1.3.2<!-- /version -->
 *   <!-- version:compat -->0.1.0<!-- /version -->
 *
 * HTML comment markers are invisible on GitHub, on the VitePress site,
 * and in the llms.txt export, so readers always see a plain, current
 * number. Code fences cannot carry comment markers, so a short list of
 * file scoped regex rules below covers version strings inside fenced
 * examples.
 *
 * Honesty gates:
 *   - The docs CI workflow reruns this script (via build:sync) and fails
 *     on any diff, so a release cannot leave the committed pages behind.
 *   - The release pipeline runs the same regeneration inside the root
 *     `version-packages` script, so the standing Version Packages PR
 *     carries the restamped pages automatically.
 *   - The script fails loudly when a file that is expected to carry
 *     markers has none, so a rewrite cannot silently detach a page from
 *     the source of truth.
 *
 * Historical statements ("v1.0.0 was published manually", "As of Rulvar
 * 1.1.0, CURRENT_HASH_VERSION is 2") are deliberately NOT marked: they
 * describe fixed points in time and must never be rewritten.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(here, '..');
const repoRoot = resolve(docsRoot, '..');

/** Directories under docs/ that hold generated or third party content. */
const SKIP_DIRS = new Set(['api', 'node_modules', '.vitepress', 'public', 'scripts']);

const MARKER = /<!--\s*version:([a-z]+)\s*-->([^<]*)<!--\s*\/version\s*-->/g;

/**
 * Files that must carry at least one marker. A refactor that drops the
 * markers from one of these pages fails the stamp instead of silently
 * freezing the page at its last stamped number.
 */
const EXPECTED_MARKER_FILES = [
  'guide/index.md',
  'guide/installation.md',
  'guide/determinism.md',
  'reference/faq.md',
  'reference/packages.md',
  'reference/versioning.md',
];

async function readVersion(manifestPath) {
  const manifest = JSON.parse(await readFile(join(repoRoot, manifestPath), 'utf8'));
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error(`${manifestPath} carries no version`);
  }
  return manifest.version;
}

async function* markdownFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        yield* markdownFiles(join(dir, entry.name));
      }
    } else if (entry.name.endsWith('.md')) {
      yield join(dir, entry.name);
    }
  }
}

const versions = {
  lockstep: await readVersion('packages/core/package.json'),
  compat: await readVersion('packages/compat/package.json'),
};

/**
 * Version strings inside fenced code blocks, where HTML comment markers
 * cannot live. Each rule is scoped to one file and one tight pattern.
 */
const CODE_FENCE_RULES = [
  {
    file: 'guide/adapter-authors.md',
    pattern: /("@rulvar\/(?:core|testing)":\s*")\^\d+\.\d+\.\d+(")/g,
    replacement: `$1^${versions.lockstep}$2`,
  },
];

let stampedFiles = 0;
let stampedSpans = 0;
const seenMarkers = new Set();

for await (const file of markdownFiles(docsRoot)) {
  const rel = relative(docsRoot, file);
  const before = await readFile(file, 'utf8');
  let after = before.replace(MARKER, (whole, key) => {
    const version = versions[key];
    if (version === undefined) {
      throw new Error(`${rel}: unknown version marker '${key}'`);
    }
    seenMarkers.add(rel);
    stampedSpans += 1;
    return `<!-- version:${key} -->${version}<!-- /version -->`;
  });
  for (const rule of CODE_FENCE_RULES) {
    if (rel === rule.file) {
      after = after.replace(rule.pattern, rule.replacement);
      seenMarkers.add(rel);
    }
  }
  if (after !== before) {
    await writeFile(file, after);
    stampedFiles += 1;
  }
}

const missing = EXPECTED_MARKER_FILES.filter((file) => !seenMarkers.has(file));
if (missing.length > 0) {
  throw new Error(
    `stamp-versions: expected version markers in ${missing.join(', ')} and found none; ` +
      'restore the markers or update EXPECTED_MARKER_FILES',
  );
}

console.log(
  `[stamp-versions] lockstep ${versions.lockstep}, compat ${versions.compat}: ` +
    `${stampedSpans} spans across ${seenMarkers.size} files (${stampedFiles} rewritten)`,
);
