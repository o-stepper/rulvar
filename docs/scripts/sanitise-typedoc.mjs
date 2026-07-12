#!/usr/bin/env node
/**
 * sanitise-typedoc.mjs
 *
 * Walks `documentation/api/**\/*.md` and escapes raw angle-bracket
 * placeholders (e.g. `<localised builder>`, `<your-token>`) that look
 * like Markdown text but are interpreted as Vue tags by VitePress'
 * template compiler. Without this step, a TypeDoc-generated page that
 * embeds README copy with a placeholder phrase fails the VitePress
 * build with "Element is missing end tag".
 *
 * The script preserves:
 *   - fenced code blocks (```language ... ```)
 *   - inline code spans (`...`)
 *   - real HTML tags from a small allowlist (`<br>`, `<hr>`, `<a>`, …)
 *
 * Anything that survives those filters and matches `< ... >` with a
 * non-tag-like body (whitespace, hyphenated words, multi-word phrases)
 * is escaped as `&lt;` / `&gt;` so the rendered output looks identical
 * but the Vue parser is happy.
 *
 * The walk also rewrites LICENSE file links: TypeDoc copies each
 * package's LICENSE into `api/_media/` as extensionless `LICENSE`,
 * `LICENSE-1`, ... and points README links there (badge links keep
 * their original `./LICENSE` form). VitePress does not ship
 * extensionless files into `dist`, so every one of those links 404s on
 * the built site. All copies carry the same Apache-2.0 text, so the links are
 * redirected to the canonical file on GitHub (the same convention
 * sync-root-docs.mjs applies to sibling-file links).
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitise } from './lib/sanitise.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(here, '..', 'api');

const REPO_BLOB_BASE = 'https://github.com/o-stepper/rulvar/blob/main';

/**
 * Redirects markdown links whose destination is a TypeDoc-copied
 * LICENSE file (`_media/LICENSE`, `_media/LICENSE-3`, `./LICENSE`, ...)
 * to the canonical LICENSE on GitHub. See the header comment for why
 * the local copies never make it into the built site.
 */
function rewriteLicenseLinks(markdown) {
  return markdown.replace(
    /\]\((?:\.\.?\/)*(?:_media\/)?LICENSE(?:-\d+)?\)/g,
    `](${REPO_BLOB_BASE}/LICENSE)`,
  );
}

async function* walkMarkdown(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === 'ENOENT') return;
    throw err;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkMarkdown(full);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      yield full;
    }
  }
}

/**
 * W-128 determinism: 'Defined in' references that point into a
 * sibling package's BUILT dist/*.d.ts carry line numbers that are not
 * stable across operating systems (tsdown/rolldown emits declaration
 * member order differently on linux vs macos - observed as swapped
 * #L100/#L102 pairs in protocol's server-message.d.ts). A line number
 * into a generated bundle is useless to a reader anyway, so the
 * sanitiser drops it: link text keeps the file path, the href keeps
 * the file URL without the #L anchor.
 */
function stripDistLineAnchors(text) {
  return text.replace(
    /\[((?:packages\/[^\]]*?\/dist\/[^\]:]+?\.d\.ts)):\d+\]\(([^)#]+)#L\d+\)/g,
    '[$1]($2)',
  );
}

/**
 * Repairs 'Defined in' source-link hrefs. Under `entryPointStrategy:
 * "packages"` with explicit per-package `entryPoints`, TypeDoc renders
 * the link TEXT relative to the repository root (via the top-level
 * `basePath`) but fills the `{path}` placeholder of
 * `sourceLinkTemplate` relative to the package's common source
 * directory, producing hrefs like `blob/main/l0/schema.ts` that drop
 * the `packages/<name>/src/` prefix and 404 on GitHub. The link text
 * carries the correct repo-relative path, so the href is rebuilt from
 * it.
 */
function fixSourceLinkHrefs(text) {
  return text.replace(
    /\[([^\]\s]+\.ts):(\d+)\]\(https:\/\/github\.com\/o-stepper\/rulvar\/blob\/main\/[^)#]+#L\d+\)/g,
    (_whole, path, line) => `[${path}:${line}](${REPO_BLOB_BASE}/${path}#L${line})`,
  );
}

/**
 * Unlinks 'Defined in' references whose target cannot exist on GitHub:
 * symbols re-exported across packages resolve to the sibling package's
 * BUILT `dist/*.d.ts` (hrefs like `blob/main/../../core/dist/index.d.ts`;
 * dist is not committed), and lib types resolve into `node_modules/`.
 * Both 404 on GitHub, so the link is replaced by its plain text in code
 * font; links with a real `packages/...` source path are left alone.
 */
function unlinkNonRepoSourceLinks(text) {
  return text.replace(
    /\[([^\]]+)\]\(https:\/\/github\.com\/o-stepper\/rulvar\/blob\/main\/[^)]*(?:\.\.\/|node_modules\/|\/dist\/)[^)]*\)/g,
    (_whole, label) => {
      const plain = label.replace(/`/g, '');
      return `\`${plain}\``;
    },
  );
}

async function main() {
  try {
    await stat(apiRoot);
  } catch {
    console.warn('[rulvar/docs] sanitise-typedoc: api/ does not exist; skipping');
    return;
  }
  let count = 0;
  for await (const file of walkMarkdown(apiRoot)) {
    const before = await readFile(file, 'utf8');
    const after = rewriteLicenseLinks(
      unlinkNonRepoSourceLinks(fixSourceLinkHrefs(stripDistLineAnchors(sanitise(before)))),
    );
    if (after !== before) {
      await writeFile(file, after, 'utf8');
      count += 1;
    }
  }
  console.log(`[rulvar/docs] sanitise-typedoc: rewrote ${count} file(s)`);
}

main().catch((err) => {
  console.error('[rulvar/docs] sanitise-typedoc: fatal:', err);
  process.exit(1);
});
