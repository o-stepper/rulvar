#!/usr/bin/env node
/**
 * build-llms-txt.mjs
 *
 * Generates three LLM-friendly artefacts in the VitePress build output
 * (and also into `public/` so `pnpm dev` serves them):
 *
 *   - llms.txt      - the short, navigable index defined by the
 *                     llmstxt.org convention: guide + reference +
 *                     contributing only, with an `Optional` pointer
 *                     section to the two larger artefacts. The
 *                     generated API pages live in llms-api.txt so the
 *                     short index stays short.
 *   - llms-api.txt  - index of every generated API reference page.
 *   - llms-full.txt - concatenated Markdown body of every published
 *                     page, sectioned with stable URL anchors.
 *
 * A hard size floor guards the regression class: if llms.txt exceeds
 * MAX_INDEX_BYTES the build fails (that only happens when the api
 * section leaks back in or the hand-written docs grow tenfold; raise
 * the ceiling consciously in that second case).
 *
 * The script walks the documentation source tree (Markdown only) and
 * leaves the VitePress build output untouched. Run it after a
 * `vitepress build` so that the rendered site is already on disk.
 *
 * `--self-test` exercises the pure builder against a fixture tree.
 */

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(here, '..');
const distDir = join(docsRoot, '.vitepress', 'dist');
const publicDir = join(docsRoot, 'public');
const SITE_URL = 'https://docs.rulvar.com';

/** llms.txt must stay a short index; see the header comment. */
const MAX_INDEX_BYTES = 64 * 1024;

/** Sections included in the short llms.txt index. */
const INDEX_SECTION_ROOTS = [
  { dir: 'guide', label: 'Guide' },
  { dir: 'reference', label: 'Reference' },
  { dir: 'contributing', label: 'Contributing' },
];

/**
 * Sections indexed in llms-api.txt (generated API reference).
 * llms-full.txt concatenates INDEX_SECTION_ROOTS + API_SECTION_ROOTS.
 */
const API_SECTION_ROOTS = [{ dir: 'api', label: 'API reference' }];

/** Walk a directory and yield Markdown source files. */
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
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;
    if (entry.name.startsWith('.')) continue;
    yield full;
  }
}

/**
 * HTML comments are invisible on the rendered site and on GitHub, so
 * they must not leak into the LLM export either (the version stamp
 * markers of stamp-versions.mjs, the auto-sync banners). No published
 * page carries a comment inside a code fence, so a flat strip is safe.
 */
function stripHtmlComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, '');
}

function frontmatterFields(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { title: null, description: null, body: stripHtmlComments(source) };
  const yaml = match[1];
  const titleLine = yaml.match(/^title:\s*(.+)$/m);
  const descLine = yaml.match(/^description:\s*(.+)$/m);
  const stripQuotes = (s) => s?.trim().replace(/^["']/, '').replace(/["']$/, '');
  return {
    title: stripQuotes(titleLine?.[1]) ?? null,
    description: stripQuotes(descLine?.[1]) ?? null,
    body: stripHtmlComments(source.slice(match[0].length)),
  };
}

function firstHeading(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function firstParagraph(body) {
  const stripped = body.replace(/^#.*$/gm, '').replace(/^>.*$/gm, '');
  const m = stripped.match(/[^\n][^\n]+/);
  return m ? m[0].trim() : '';
}

function relativeToSection(absPath, sectionDir) {
  return relative(sectionDir, absPath).replace(/\\/g, '/');
}

function pageUrlFor(sectionDir, absPath) {
  const rel = relativeToSection(absPath, sectionDir);
  let route = rel.replace(/\.md$/, '');
  if (route === 'index') route = '';
  if (route.endsWith('/index')) route = route.slice(0, -'/index'.length);
  return `${SITE_URL}/${relative(docsRoot, sectionDir)}/${route}`.replace(/\/+$/, '');
}

async function collectSection(section) {
  const sectionDir = join(docsRoot, section.dir);
  const items = [];
  for await (const file of walkMarkdown(sectionDir)) {
    const raw = await readFile(file, 'utf8');
    const { title, description, body } = frontmatterFields(raw);
    items.push({
      file,
      url: pageUrlFor(sectionDir, file),
      title: title ?? firstHeading(body) ?? relativeToSection(file, sectionDir),
      description: description ?? firstParagraph(body),
      body,
    });
  }
  items.sort((a, b) => a.url.localeCompare(b.url));
  return items;
}

function sectionIndexLines(sections) {
  const lines = [];
  for (const section of sections) {
    if (section.pages.length === 0) continue;
    lines.push(`## ${section.label}`, '');
    for (const page of section.pages) {
      const desc = page.description ? `: ${page.description}` : '';
      lines.push(`- [${page.title}](${page.url})${desc}`);
    }
    lines.push('');
  }
  return lines;
}

/**
 * Pure builder: takes `{ index, api, full }` section arrays (each entry
 * `{ label, pages: [{ url, title, description, body }] }`) and returns the
 * three artefact strings. Exported shape for the self-test.
 */
export function buildArtifacts({ index, api, full }) {
  const llmsTxt = [
    '# Rulvar',
    '',
    '> An embeddable TypeScript engine for multi-agent LLM workflows:',
    '> durable (a completed LLM call is never paid for twice),',
    '> budget-bounded, vendor-neutral, observable, and testable.',
    '> No server, no database, no control plane.',
    '> Created and maintained by Oleksiy Stepurenko. Apache-2.0 License.',
    '',
    `- Website: ${SITE_URL}`,
    '- Landing page: https://rulvar.com',
    '- Repository: https://github.com/o-stepper/rulvar',
    '- Maintainer: Oleksiy Stepurenko <step.oleksiy@gmail.com>',
    '- License: Apache-2.0 (© 2026 Oleksiy Stepurenko)',
    '',
    `Read [Rulvar for LLMs](${SITE_URL}/guide/llms) first: a single self-contained`,
    'orientation page for AI assistants, with the API surface, the rules generated',
    'code must follow, and one canonical program.',
    '',
    ...sectionIndexLines(index),
    // llmstxt.org convention: secondary resources go under `## Optional`
    // so a consumer with a tight context can skip them knowingly.
    '## Optional',
    '',
    `- [API reference index](${SITE_URL}/llms-api.txt): one line per generated API page`,
    `- [Full documentation snapshot](${SITE_URL}/llms-full.txt): concatenated Markdown of every published page`,
    '',
  ].join('\n');

  const llmsApiTxt = [
    '# Rulvar - API reference index',
    '',
    '> Index of the generated API reference pages (TypeDoc output for every',
    '> @rulvar package). The short site index lives at /llms.txt.',
    '',
    ...sectionIndexLines(api),
  ].join('\n');

  const fullChunks = [
    '# Rulvar - full documentation snapshot',
    '',
    'This is the auto-generated, machine-readable concatenation of every',
    'public documentation page. It is intended for consumption by AI',
    'assistants - see the short index at /llms.txt.',
    '',
    `Source: ${SITE_URL}`,
    'Repository: https://github.com/o-stepper/rulvar',
    'Maintainer: Oleksiy Stepurenko <step.oleksiy@gmail.com>',
    'License: Apache-2.0 (© 2026 Oleksiy Stepurenko)',
    '',
  ];
  for (const section of full) {
    if (section.pages.length === 0) continue;
    fullChunks.push(`# === ${section.label} ===`, '');
    for (const page of section.pages) {
      fullChunks.push('---');
      fullChunks.push(`url: ${page.url}`);
      fullChunks.push(`title: ${page.title}`);
      if (page.description) fullChunks.push(`description: ${page.description}`);
      fullChunks.push('---', '');
      fullChunks.push(page.body.trim(), '');
    }
  }
  const llmsFullTxt = fullChunks.join('\n');

  return { llmsTxt, llmsApiTxt, llmsFullTxt };
}

async function main() {
  const index = [];
  for (const section of INDEX_SECTION_ROOTS) {
    index.push({ ...section, pages: await collectSection(section) });
  }
  const api = [];
  for (const section of API_SECTION_ROOTS) {
    api.push({ ...section, pages: await collectSection(section) });
  }
  const full = [...index, ...api];

  const { llmsTxt, llmsApiTxt, llmsFullTxt } = buildArtifacts({ index, api, full });

  const indexBytes = Buffer.byteLength(llmsTxt, 'utf8');
  if (indexBytes > MAX_INDEX_BYTES) {
    console.error(
      `[rulvar/docs] llms.txt is ${indexBytes} bytes (> ${MAX_INDEX_BYTES}): ` +
        'the short index regressed - did the api section leak back in?',
    );
    process.exit(1);
  }

  // Always write into /public so dev mode serves the artefacts.
  await mkdir(publicDir, { recursive: true });
  await writeFile(join(publicDir, 'llms.txt'), llmsTxt, 'utf8');
  await writeFile(join(publicDir, 'llms-api.txt'), llmsApiTxt, 'utf8');
  await writeFile(join(publicDir, 'llms-full.txt'), llmsFullTxt, 'utf8');
  console.log(
    `[rulvar/docs] llms.txt: wrote ${indexBytes} chars to public/llms.txt (ceiling ${MAX_INDEX_BYTES})`,
  );
  console.log(
    `[rulvar/docs] llms-api.txt: wrote ${llmsApiTxt.length} chars to public/llms-api.txt`,
  );
  console.log(
    `[rulvar/docs] llms-full.txt: wrote ${llmsFullTxt.length} chars to public/llms-full.txt`,
  );

  // Mirror into the build output if VitePress has already produced one.
  try {
    await stat(distDir);
    await writeFile(join(distDir, 'llms.txt'), llmsTxt, 'utf8');
    await writeFile(join(distDir, 'llms-api.txt'), llmsApiTxt, 'utf8');
    await writeFile(join(distDir, 'llms-full.txt'), llmsFullTxt, 'utf8');
    console.log('[rulvar/docs] llms artefacts mirrored into .vitepress/dist');
  } catch {
    /* no build output yet - running before `vitepress build`; ok */
  }
}

function selfTest() {
  const page = (url, title, body = 'Body.') => ({ url, title, description: '', body });
  const fixture = {
    index: [
      { label: 'Guide', pages: [page(`${SITE_URL}/guide/quickstart`, 'Quickstart')] },
      { label: 'Reference', pages: [page(`${SITE_URL}/reference/faq`, 'FAQ')] },
    ],
    api: [
      {
        label: 'API reference',
        pages: [page(`${SITE_URL}/api/@rulvar/core/functions/createEngine`, 'createEngine')],
      },
    ],
    full: [],
  };
  fixture.full = [...fixture.index, ...fixture.api];
  const { llmsTxt, llmsApiTxt, llmsFullTxt } = buildArtifacts(fixture);
  const cases = [
    ['llms.txt has no /api/ page links', !llmsTxt.includes('/api/@rulvar')],
    ['llms.txt keeps the guide link', llmsTxt.includes(`${SITE_URL}/guide/quickstart`)],
    [
      'llms.txt points at llms-api.txt and llms-full.txt',
      llmsTxt.includes(`${SITE_URL}/llms-api.txt`) && llmsTxt.includes(`${SITE_URL}/llms-full.txt`),
    ],
    ['llms.txt has the Optional section', llmsTxt.includes('## Optional')],
    ['llms.txt points at the LLM primer page', llmsTxt.includes(`${SITE_URL}/guide/llms`)],
    ['llms-api.txt carries the api pages', llmsApiTxt.includes('/api/@rulvar/core/functions')],
    ['llms-full.txt still concatenates everything', llmsFullTxt.includes('=== API reference ===')],
  ];
  let bad = 0;
  for (const [label, pass] of cases) {
    if (!pass) {
      bad += 1;
      console.error(`self-test FAIL [${label}]`);
    }
  }
  console.log(
    bad === 0
      ? `[build-llms-txt] self-test: ${cases.length}/${cases.length} ok`
      : `[build-llms-txt] self-test: ${bad} failed`,
  );
  process.exit(bad > 0 ? 1 : 0);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  main().catch((err) => {
    console.error('[rulvar/docs] build-llms-txt: fatal:', err);
    process.exit(1);
  });
}
