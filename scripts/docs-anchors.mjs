// The internal-anchor gate (RV2704).
//
// A link like `/guide/orchestration-modes#the-finish-validation-contract`
// is two claims: that the page exists, and that the heading does. The
// second one had NO local check. `pnpm docs:lint` never looked at
// anchors, so a link to a heading that was renamed (or never existed)
// went green through every fast gate and turned red only on CI, inside
// the offline link check that runs after the whole site is built.
//
// Deciding it locally is a read of the markdown: collect what each page
// anchors, resolve every internal link against that. The rule that
// makes it worth having is the SLUG rule, and it must be VitePress's
// exactly. An approximate slugger reports four false failures on links
// that work today, because `@rulvar/store-postgres` and `children's`
// slug through punctuation the approximation drops instead of turning
// into a separator, and a gate that cries wolf on correct links is
// worse than no gate.
//
// Its own module rather than a section of docs-lint.mjs, for the RV2603
// reason: a probe defending a rule must name a fragment that occurs
// ONCE in the file it points at, and docs-lint.mjs is a thousand lines
// of neighbouring rules. docs-lint.mjs imports the slug from here, so
// there is one slug rule in the repository rather than two.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// The three classes VitePress's slugger folds, byte for byte from
// @mdit-vue/shared (vitepress 1.6.4, dist/node/chunk-D3CUZ4fa.js:17687).
// Copied rather than imported: the gate must run before any site build
// and from a plain node process, and the exported symbol is not part of
// vitepress's public entry. The docs-anchors test pins the four
// slugging shapes that a hand-rolled approximation gets wrong, so a
// drift in the upstream rule surfaces as a failing expectation here
// instead of as a false accusation against a correct link.
const CONTROL = /[\u0000-\u001f]/gu;
const SPECIAL = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/gu;
const COMBINING = /[\u0300-\u036f]/gu;

/**
 * The heading slug VitePress publishes, exactly.
 * @param {string} text the heading's rendered text
 * @returns {string}
 */
export function vitepressSlug(text) {
  return text
    .normalize('NFKD')
    .replace(COMBINING, '')
    .replace(CONTROL, '')
    .replace(SPECIAL, '-')
    .replace(/-{2,}/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .replace(/^(\d)/u, '_$1')
    .toLowerCase();
}

/**
 * The text markdown-it-anchor slugs: the content of the heading's
 * `text` and `code_inline` tokens, joined.
 *
 * That token filter is what the emulation below reproduces. Inline
 * code keeps its content (the backticks are not tokens); a link
 * contributes its label and never its href; an image contributes
 * NOTHING, because its alt text lives in an `image` token the filter
 * drops; raw HTML tags contribute nothing while the text between them
 * does; and a backslash escape contributes the escaped character,
 * which is how the generated API pages spell `\{`.
 *
 * @param {string} raw the heading source after its `#` marker
 * @returns {string}
 */
export function headingText(raw) {
  return (
    raw
      .replace(/\{#[^}]*\}\s*$/u, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/gu, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/gu, '$1')
      // A real tag is dropped; a BACKSLASH-ESCAPED angle bracket is a
      // literal character, which is how the generated API pages spell a
      // generic (`Record\<string, number\>`). Unescaping first would make
      // the generic look like a tag and delete the type.
      .replace(/(?<!\\)<[^>]+>/gu, '')
      .replace(/`+/gu, '')
      .replace(/\*\*|__|\*|~~/gu, '')
      // Single-underscore emphasis only at a word boundary: markdown-it
      // leaves an INTRAWORD underscore literal, and `run_settle` slugs as
      // run-settle rather than as runsettle.
      .replace(/(?<!\w)_([^_]+)_(?!\w)/gu, '$1')
      .replace(/&lt;/gu, '<')
      .replace(/&gt;/gu, '>')
      .replace(/&amp;/gu, '&')
      .replace(/\\(.)/gu, '$1')
      .trim()
  );
}

/** A fence opener or closer, the same shape docs-lint tracks. */
const FENCE = /^\s*(?:```|~~~)/u;

/**
 * Every anchor one page publishes.
 *
 * Three producers, all of them real on this site: markdown headings
 * (slugged, with markdown-it-anchor's `-1`, `-2` suffixes for repeats,
 * which is why the generated API tree can carry four `#returns` on one
 * page), the explicit `{#custom-id}` attribute (which REPLACES the
 * slug, never adds to it), and raw HTML ids, which is how TypeDoc
 * anchors the property rows of a class table.
 *
 * @param {string} markdown
 * @returns {Set<string>}
 */
export function anchorsOf(markdown) {
  const anchors = new Set();
  /** @param {string} candidate */
  const claim = (candidate) => {
    if (candidate === '') {
      return;
    }
    if (!anchors.has(candidate)) {
      anchors.add(candidate);
      return;
    }
    for (let i = 1; ; i += 1) {
      const suffixed = `${candidate}-${String(i)}`;
      if (!anchors.has(suffixed)) {
        anchors.add(suffixed);
        return;
      }
    }
  };
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    // Raw HTML ids are collected from ANY line, heading or not: they
    // are literal ids on the rendered page and never collide with the
    // slug counter, so they are added directly.
    for (const html of line.matchAll(/<[a-zA-Z][^>]*\s(?:id|name)=["']([^"']+)["']/gu)) {
      anchors.add(html[1]);
    }
    const heading = /^#{1,6}\s+(.*)$/u.exec(line);
    if (heading?.[1] === undefined) {
      continue;
    }
    const explicit = /\{#([^}\s]+)\}\s*$/u.exec(heading[1]);
    claim(explicit?.[1] ?? vitepressSlug(headingText(heading[1])));
  }
  return anchors;
}

/**
 * Every internal link carrying an anchor, with the line it sits on.
 * External schemes are none of this gate's business (the CI link check
 * owns those), and a link with no `#` makes no claim about a heading.
 *
 * @param {string} markdown
 * @returns {{ line: number, target: string, anchor: string }[]}
 */
export function anchorLinksOf(markdown) {
  /** @type {{ line: number, target: string, anchor: string }[]} */
  const links = [];
  let inFence = false;
  markdown.split('\n').forEach((line, index) => {
    if (FENCE.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) {
      return;
    }
    for (const match of line.matchAll(/\]\(([^)\s]*#[^)\s]+)\)/gu)) {
      const href = match[1];
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/u.test(href)) {
        continue;
      }
      const hash = href.indexOf('#');
      links.push({
        line: index + 1,
        target: href.slice(0, hash),
        anchor: decodeURIComponent(href.slice(hash + 1)),
      });
    }
  });
  return links;
}

/**
 * The page paths a link target can mean, in the order VitePress
 * resolves them: the file itself, the extensionless page, and the
 * directory index. Paths are docs-relative and POSIX-separated, so the
 * caller's page map is keyed the way the site addresses its own pages.
 *
 * @param {string} from the docs-relative path of the page holding the link
 * @param {string} target the link's path part, possibly empty (same page)
 * @returns {string[]}
 */
export function candidatePages(from, target) {
  if (target === '') {
    return [from];
  }
  const fromDir = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
  const resolved = target.startsWith('/')
    ? target.slice(1)
    : // A relative target resolves against the linking page's directory;
      // `..` segments are folded here rather than by the platform's path
      // join, so the result stays POSIX on every runner.
      [...fromDir.split('/').filter((part) => part !== ''), ...target.split('/')]
        .reduce((/** @type {string[]} */ parts, part) => {
          if (part === '' || part === '.') {
            return parts;
          }
          if (part === '..') {
            parts.pop();
            return parts;
          }
          parts.push(part);
          return parts;
        }, [])
        .join('/');
  const base = resolved.endsWith('/') ? resolved.slice(0, -1) : resolved;
  if (base.endsWith('.md')) {
    return [base];
  }
  if (base.endsWith('.html')) {
    return [`${base.slice(0, -5)}.md`, `${base.slice(0, -5)}/index.md`];
  }
  return [`${base}.md`, `${base}/index.md`];
}

/**
 * The gate itself, pure: every anchor link of every SOURCE page must
 * resolve to a page in `pages` that publishes that anchor.
 *
 * Sources and pages are separate arguments on purpose. The generated
 * API tree is a legitimate link TARGET (the guides point into it) and
 * not a source this repository can fix by hand, so it is loaded as
 * pages and never judged.
 *
 * @param {Map<string, string>} pages docs-relative path to markdown text
 * @param {Iterable<string>} sources docs-relative paths to judge
 * @returns {{ file: string, line: number, message: string }[]}
 */
export function anchorProblems(pages, sources) {
  /** @type {Map<string, Set<string>>} */
  const anchorCache = new Map();
  /** @param {string} path */
  const anchorsFor = (path) => {
    let known = anchorCache.get(path);
    if (known === undefined) {
      known = anchorsOf(pages.get(path) ?? '');
      anchorCache.set(path, known);
    }
    return known;
  };
  /** @type {{ file: string, line: number, message: string }[]} */
  const problems = [];
  for (const source of sources) {
    const text = pages.get(source);
    if (text === undefined) {
      continue;
    }
    for (const link of anchorLinksOf(text)) {
      const candidates = candidatePages(source, link.target);
      const page = candidates.find((candidate) => pages.has(candidate));
      if (page === undefined) {
        problems.push({
          file: source,
          line: link.line,
          message:
            `link target '${link.target}' resolves to no page ` +
            `(tried ${candidates.join(', ')})`,
        });
        continue;
      }
      if (anchorsFor(page).has(link.anchor)) {
        continue;
      }
      problems.push({
        file: source,
        line: link.line,
        message:
          `'${page}' publishes no anchor '#${link.anchor}'; ` +
          'the heading was renamed or never existed (VitePress slugs the rendered heading text, ' +
          'so punctuation becomes a separator: "children\'s" anchors as children-s)',
      });
    }
  }
  return problems;
}

/** Generated or mirrored trees: valid targets, never judged as sources. */
const GENERATED_DIRS = new Set(['api']);
const EXCLUDED_DIRS = new Set(['node_modules', '.vitepress']);
const GENERATED_FILES = new Set(['contributing/index.md', 'reference/changelog.md']);

/**
 * Every markdown page under docs/, keyed docs-relative and
 * POSIX-separated.
 * @returns {{ pages: Map<string, string>, sources: string[] }}
 */
function loadDocs() {
  const docsRoot = join(ROOT, 'docs');
  /** @type {Map<string, string>} */
  const pages = new Map();
  /** @type {string[]} */
  const sources = [];
  /** @param {string} dir */
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) {
          walk(full);
        }
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }
      const rel = relative(docsRoot, full).split(sep).join('/');
      pages.set(rel, readFileSync(full, 'utf8'));
      const top = rel.includes('/') ? rel.slice(0, rel.indexOf('/')) : '';
      if (!GENERATED_DIRS.has(top) && !GENERATED_FILES.has(rel)) {
        sources.push(rel);
      }
    }
  };
  walk(docsRoot);
  return { pages, sources };
}

function main() {
  const { pages, sources } = loadDocs();
  const problems = anchorProblems(pages, sources);
  for (const problem of problems) {
    console.error(`docs/${problem.file}:${String(problem.line)}: ${problem.message}`);
  }
  if (problems.length > 0) {
    console.error(
      `\n[docs-anchors] ${String(problems.length)} broken internal anchor(s); ` +
        'the site build would render them as links to nowhere',
    );
    process.exit(1);
  }
  const linkCount = sources.reduce(
    (total, source) => total + anchorLinksOf(pages.get(source) ?? '').length,
    0,
  );
  console.log(
    `[docs-anchors] all ${String(linkCount)} internal anchors across ${String(sources.length)} ` +
      'hand-written pages resolve',
  );
}

// The RV2603 guard: importing this module (the tests do) must not run
// the check.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
