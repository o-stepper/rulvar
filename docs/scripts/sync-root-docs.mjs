#!/usr/bin/env node
/**
 * sync-root-docs.mjs
 *
 * Mirrors the authoritative top-level Markdown files from the repository
 * root into the documentation tree, prefixed with a banner that explains
 * the file is auto-synced. Single source of truth stays at the
 * repository root.
 *
 *   ../CONTRIBUTING.md -> contributing/index.md
 *
 * The script also rewrites in-document references that point at sibling
 * repository files (`LICENSE`, `README.md`, ...) so that, on the
 * documentation site, those links land on the GitHub repository copy.
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitise } from './lib/sanitise.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(here, '..');
const repoRoot = resolve(docsRoot, '..');

const REPO_BLOB_BASE = 'https://github.com/o-stepper/rulvar/blob/main';

/** @type {{ from: string; to: string; title: string; description?: string }[]} */
const targets = [
  {
    from: 'CONTRIBUTING.md',
    to: 'contributing/index.md',
    title: 'Contributing',
    description:
      'How to set up the repository, the development workflow, and the project conventions.',
  },
];

/**
 * Rewrite repository-relative Markdown links so they resolve correctly
 * when the file is rendered on the documentation site.
 */
function rewriteLinks(body) {
  return (
    body
      // (LICENSE) / (./LICENSE) -> github.com/.../LICENSE
      .replace(/\]\((?:\.\/)?(LICENSE|NOTICE|AUTHORS\.md)\)/g, `](${REPO_BLOB_BASE}/$1)`)
      // (CONTRIBUTING.md) self-reference -> the synced page itself
      .replace(/\]\((?:\.\/)?CONTRIBUTING\.md\)/g, '](/contributing/)')
      // (README.md) -> the GitHub copy
      .replace(/\]\((?:\.\/)?README\.md\)/g, `](${REPO_BLOB_BASE}/README.md)`)
      // (.changeset/...), (.github/...), (scripts/...) -> the GitHub copies
      .replace(/\]\((?:\.\/)?\.changeset\/([^)]+)\)/g, `](${REPO_BLOB_BASE}/.changeset/$1)`)
      .replace(/\]\((?:\.\/)?\.github\/([^)]+)\)/g, `](${REPO_BLOB_BASE}/.github/$1)`)
      .replace(/\]\((?:\.\/)?scripts\/([^)]+)\)/g, `](${REPO_BLOB_BASE}/scripts/$1)`)
  );
}

/**
 * Strip the first level-1 heading (`# Title`) - VitePress will render the
 * frontmatter `title` instead (we also inject `# ${title}`), so leaving the
 * source H1 in place duplicates the heading on the docs page.
 *
 * Root files may start with HTML comment blocks; those are kept; only the
 * first `# ...` line after optional comments is removed.
 *
 * Implementation note: an obvious regex (`(?:<!--[\s\S]*?-->\s*)*`) is
 * vulnerable to catastrophic backtracking on inputs that contain many
 * `--><!--` boundaries with no terminating heading (CodeQL js/redos).
 * The state machine below is linear in `body.length` regardless of
 * input shape.
 */
function stripFirstH1(body) {
  const isWhitespace = (ch) =>
    ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
  const len = body.length;
  let i = 0;
  for (;;) {
    while (i < len && isWhitespace(body[i])) i++;
    if (body.startsWith('<!--', i)) {
      const end = body.indexOf('-->', i + 4);
      if (end === -1) return body;
      i = end + 3;
      continue;
    }
    break;
  }
  if (i >= len || body[i] !== '#') return body;
  if (i + 1 >= len || !isWhitespace(body[i + 1])) return body;
  const lineEnd = body.indexOf('\n', i);
  if (lineEnd === -1) return body;
  let j = lineEnd + 1;
  while (j < len && body[j] === '\n') j++;
  if (j === lineEnd + 1) return body;
  return body.slice(0, i) + body.slice(j);
}

async function syncOne({ from, to, title, description }) {
  const sourcePath = join(repoRoot, from);
  const targetPath = join(docsRoot, to);
  let source;
  try {
    source = await readFile(sourcePath, 'utf8');
  } catch (err) {
    console.warn(`[rulvar/docs] sync-root-docs: skipped '${from}' - ${err?.message || err}`);
    return;
  }
  const banner = [
    '<!--',
    `  This page is auto-synced from /${from} on every documentation build.`,
    `  Do not edit it directly - change /${from} in the repository root.`,
    '-->',
  ].join('\n');
  const frontmatterLines = [
    '---',
    `title: ${title}`,
    description ? `description: ${JSON.stringify(description)}` : undefined,
    'editLink: false',
    '---',
  ].filter((line) => typeof line === 'string');
  const frontmatter = frontmatterLines.join('\n');
  const body = sanitise(stripFirstH1(rewriteLinks(source)));
  const finalBody = `${frontmatter}\n\n${banner}\n\n# ${title}\n\n${body}`.replace(
    /\n{3,}/g,
    '\n\n',
  );
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, finalBody, 'utf8');
  console.log(`[rulvar/docs] sync-root-docs: wrote ${to}`);
}

async function main() {
  try {
    await stat(repoRoot);
  } catch (err) {
    console.error('[rulvar/docs] sync-root-docs: cannot reach repo root:', err?.message || err);
    process.exit(1);
  }
  for (const target of targets) {
    await syncOne(target);
  }
}

main().catch((err) => {
  console.error('[rulvar/docs] sync-root-docs: fatal:', err);
  process.exit(1);
});
