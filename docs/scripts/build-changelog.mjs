#!/usr/bin/env node
/**
 * build-changelog.mjs
 *
 * Aggregates the per-package Changesets CHANGELOGs
 * (`packages/<dir>/CHANGELOG.md`) into a single generated page at
 * `reference/changelog.md`. The repository has no root CHANGELOG: the
 * fixed group releases in lockstep and Changesets writes one changelog
 * per package, so the docs page is a projection, never a source.
 *
 * Each package's H1 (`# @rulvar/core`) becomes an H2 section and every
 * heading below it is demoted by one level, giving the page a single H1
 * as required by scripts/docs-lint.mjs. The output is deterministic
 * (packages sorted by name) so CI can diff a fresh regeneration against
 * the committed copy.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitise } from './lib/sanitise.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(here, '..');
const packagesRoot = resolve(docsRoot, '..', 'packages');
const targetPath = join(docsRoot, 'reference', 'changelog.md');

/** Demote every ATX heading outside fenced code blocks by one level. */
function demoteHeadings(body) {
  const lines = body.split('\n');
  let inFence = false;
  return lines
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (!inFence && /^#{1,5} /.test(line)) {
        return `#${line}`;
      }
      return line;
    })
    .join('\n');
}

async function collect() {
  const dirs = (await readdir(packagesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const sections = [];
  for (const dir of dirs) {
    let raw;
    try {
      raw = await readFile(join(packagesRoot, dir, 'CHANGELOG.md'), 'utf8');
    } catch {
      continue;
    }
    const nameMatch = raw.match(/^#\s+(.+)$/m);
    const name = nameMatch ? nameMatch[1].trim() : dir;
    const body = nameMatch ? raw.slice(raw.indexOf(nameMatch[0]) + nameMatch[0].length) : raw;
    // Changeset texts routinely carry raw angle placeholders
    // (`approval:<seq>`, `Out<S>`) that fail the Vue template compiler.
    sections.push({ name, body: sanitise(demoteHeadings(body)).trim() });
  }
  return sections;
}

async function main() {
  const sections = await collect();
  const banner = [
    '<!--',
    '  This page is generated from packages/*/CHANGELOG.md on every',
    '  documentation build (docs/scripts/build-changelog.mjs). Do not',
    '  edit it directly - Changesets owns the per-package changelogs.',
    '-->',
  ].join('\n');
  const frontmatter = [
    '---',
    'title: Changelog',
    'description: "Per-package release notes for the @rulvar packages, aggregated from the Changesets changelogs."',
    'editLink: false',
    '---',
  ].join('\n');
  const intro = [
    'All packages in the fixed group release in lockstep with identical',
    'versions; `@rulvar/compat` is versioned independently. The sections',
    'below mirror each package\'s `CHANGELOG.md` as written by Changesets.',
  ].join('\n');
  const chunks = [frontmatter, '', banner, '', '# Changelog', '', intro, ''];
  for (const section of sections) {
    chunks.push(`## ${section.name}`, '', section.body, '');
  }
  const output = `${chunks.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
  await writeFile(targetPath, output, 'utf8');
  console.log(
    `[rulvar/docs] build-changelog: wrote reference/changelog.md (${sections.length} packages)`,
  );
}

main().catch((err) => {
  console.error('[rulvar/docs] build-changelog: fatal:', err);
  process.exit(1);
});
