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
// Plus four cross-file checks:
//   5. Every member of the InvocationRole union in core has a canonical
//      table row on docs/guide/agents.md, so a new role cannot ship
//      undocumented.
//   6. The CLI's dynamic companions, the literal import('@rulvar/x')
//      specifiers in packages/cli/src/commands.ts, exactly match the
//      companions named in the @rulvar/cli package row and drawn as
//      dotted edges in the dependency graph on docs/reference/packages.md
//      (both directions, so a new or dropped companion cannot drift).
//   7. Every dated pricingVersion literal in the hand-written docs equals
//      the current adapter export, so a price-table revision cannot leave
//      a stale snapshot stamp behind.
//   8. Every CALL of the public orchestrate or orchestratePlanned helper
//      in a TypeScript/JavaScript fence either passes RunOptions with
//      `budgetUsd` (fourth argument onward) or carries a `root-uncapped`
//      marker bound to that specific call, so a canonical example cannot
//      quietly demonstrate an unbounded tree (the nested ctx.orchestrate
//      form runs under its parent's admission and is exempt). Enforced
//      per call, not per fence, since the v1.20.0 review (P3-4).
//
// Scope: every hand-written .md under docs/, recursively. Generated or
// mirrored trees are excluded: docs/api (TypeDoc output), docs/node_modules,
// docs/.vitepress (build output and cache), docs/contributing/index.md
// (synced from /CONTRIBUTING.md, which is linted directly), and
// docs/reference/changelog.md (aggregated from packages/*/CHANGELOG.md).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import ts from 'typescript';

// fileURLToPath, not URL.pathname: pathname keeps percent-escapes (a
// checkout under a path with a space reads "rulvar%20test") and is not a
// Windows filesystem path.
const ROOT = fileURLToPath(new URL('..', import.meta.url));

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

/**
 * The args-binding digest overclaim sentinel (v1.24.0 review P2-2).
 * `RunMeta.argsHash` is a deterministic, UNSALTED SHA-256 over the JCS
 * form of a run's genesis args: it reveals when two runs shared
 * identical args, and low-entropy args (a boolean, an approval flag, a
 * role, a short id) are recoverable by hashing candidate values. So no
 * document, hand-written or generated from a TSDoc, may claim the meta
 * carries nothing sensitive or that the digest is safe to expose. The
 * fix regressed once as the shipped store.ts TSDoc "nothing sensitive
 * lands in meta"; these patterns catch that phrasing and its close
 * equivalents. Corrective negations do not match: they state the digest
 * IS sensitive rather than that nothing is.
 */
const ARGSHASH_OVERCLAIM = [
  /nothing sensitive lands in meta/iu,
  /nothing sensitive[^.]{0,40}\bmeta\b/iu,
  /\bmeta\b[^.]{0,40}nothing sensitive/iu,
  /(?:hash|digest|argshash|args hash) is safe to expose/iu,
];
const ARGSHASH_OVERCLAIM_MESSAGE =
  'args-binding digest overclaim (v1.24.0 review P2-2): RunMeta.argsHash is a deterministic, ' +
  'unsalted SHA-256 that reveals args equality and is dictionary-recoverable for low-entropy ' +
  'args. Do not claim meta carries nothing sensitive or that the hash is safe to expose; state ' +
  'that it is sensitive-derived and must be access-controlled like the journal and transcripts';

/** @param {string} text @returns {boolean} */
export function hasArgsHashOverclaim(text) {
  return ARGSHASH_OVERCLAIM.some((pattern) => pattern.test(text));
}

/**
 * The replay order overclaim sentinel (v1.32.0 review P3). Since
 * v1.32.0 same hash cassette rows replay in recorded call order; file
 * order survives only for groups recorded before v1.32.0 (rows
 * without occurrence numbers) and groups with mixed numbering. The
 * Evals guide shipped one release stating the retired semantics
 * ("replay one per call, in file order") while the Testing guide
 * stated the current one: two contracts for one public function. So
 * every "file order" mention must sit in a sentence that also scopes
 * it (occurrence, legacy, or before v1.32). Sentence boundaries are a
 * dot followed by whitespace, so a version number like v1.32.0 does
 * not end one, and the qualifier must share the sentence rather than
 * merely appear later on the page (a neighboring sentence about
 * occurrences must not legitimize an unscoped ordering claim).
 */
const FILE_ORDER = /\bfile order\b/iu;
const FILE_ORDER_QUALIFIER = /occurrence|legacy|before v1\.32/iu;
const REPLAY_ORDER_MESSAGE =
  'replay order overclaim (v1.32.0 review P3): same hash cassette rows replay in recorded call ' +
  'order since v1.32.0; file order survives only for groups recorded before v1.32.0 (no ' +
  'occurrence numbers). Scope the file order mention in its own sentence (occurrence, legacy, ' +
  'or before v1.32) instead of stating it as the ordering rule';

/** @param {string} text @returns {boolean} */
export function hasReplayOrderOverclaim(text) {
  return text
    .split(/(?<=\.)\s+/u)
    .some((sentence) => FILE_ORDER.test(sentence) && !FILE_ORDER_QUALIFIER.test(sentence));
}

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

// Check 8 machinery: root-ceiling discipline in orchestration examples
// (v1.19.0 review P2, rewritten per call after the v1.20.0 review P3-4).
// The public helpers accept the run's RunOptions as the fourth argument;
// an example that omits it starts an UNCAPPED tree while nearby prose
// routinely talks about the run ceiling. The first version of this check
// tested the whole fence for the `budgetUsd` substring or a
// `root-uncapped` marker, which was blind per fence: one capped call
// legitimized every uncapped neighbor in the same fence, and one marker
// exempted every call rather than the one it annotated. This rewrite
// parses each fence and applies the rule to EVERY bare
// orchestrate(...) / orchestratePlanned(...) call individually. The
// nested `ctx.orchestrate(...)` form is exempt: it runs under the parent
// workflow's admission, not its own RunOptions.

const HELPER_CALL = /(?<![.\w])orchestrate(?:Planned)?\s*\(/u;
const FENCE_LANG = /^\s*(?:```|~~~)\s*([A-Za-z]*)/u;
const FENCE_LANGS = ['ts', 'typescript', 'js', 'javascript'];
const UNCAPPED_MARKER = 'root-uncapped';
const CHECK8_MESSAGE =
  'uncapped orchestrate/orchestratePlanned call: EACH call must pass RunOptions with budgetUsd ' +
  'as the fourth argument, or carry its own `root-uncapped` marker bound to the call (on the ' +
  "call's line, the line above, or inside the call); a ceiling or marker on a neighboring call " +
  'does not cover this one';

/**
 * Analyzes one ts/js fence body for check 8 and returns the zero-based
 * line offsets (within the fence body) of every offending call.
 *
 * Fences are EXAMPLES and may be snippets, so parsing is lenient
 * (ts.createSourceFile never type-checks and tolerates errors). If the
 * parse yields no AST at all (throws, or produces zero statements while
 * the fence textually names a helper call), the check falls back to the
 * original fence-level rule for that fence, reported at offset 0, so an
 * odd fence can never crash the lint or silently escape it.
 *
 * A call passes when either:
 *   a. it has a fourth argument or more and the source text of arguments
 *      4..N contains `budgetUsd`, or the fourth argument is a bare
 *      identifier whose declaration in the same fence mentions
 *      `budgetUsd` (pragmatic heuristic: any VariableDeclaration in the
 *      fence whose name matches and whose declaration text contains the
 *      substring counts; no scope analysis and no cross-fence
 *      resolution, fences are self-contained examples); or
 *   b. a `root-uncapped` marker is BOUND to the call: the substring
 *      appears on the call's own starting line, on the line immediately
 *      above it, or anywhere inside the call's source span (arguments
 *      included). A marker bound to one call exempts only that call.
 *
 * Property-access callees (ctx.orchestrate) are never CallExpressions
 * with a bare identifier callee, so they stay exempt by construction,
 * as do larger identifiers that merely embed the helper name.
 *
 * @param {string} code the fence body
 * @returns {number[]} zero-based offending line offsets within the body
 */
export function checkOrchestrateFence(code) {
  if (!HELPER_CALL.test(code)) {
    return [];
  }
  /** @type {import('typescript').SourceFile | undefined} */
  let source;
  try {
    source = ts.createSourceFile('fence.ts', code, ts.ScriptTarget.Latest);
  } catch {
    source = undefined;
  }
  if (source === undefined || source.statements.length === 0) {
    // No AST at all: fence-level fallback (the pre-rewrite rule).
    return code.includes('budgetUsd') || code.includes(UNCAPPED_MARKER) ? [] : [0];
  }
  const sf = source;
  const bodyLines = code.split('\n');

  // First pass: every variable declaration whose initializer (or any
  // part of the declaration text) mentions budgetUsd, for the
  // fourth-argument-as-identifier heuristic described above.
  /** @type {Set<string>} */
  const cappedDecls = new Set();
  /** @param {import('typescript').Node} node */
  const collectDecls = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.getText(sf).includes('budgetUsd')
    ) {
      cappedDecls.add(node.name.text);
    }
    ts.forEachChild(node, collectDecls);
  };
  collectDecls(sf);

  /** @param {import('typescript').CallExpression} call @returns {boolean} */
  const hasRootCeiling = (call) => {
    if (call.arguments.length < 4) {
      return false;
    }
    const restText = call.arguments
      .slice(3)
      .map((arg) => arg.getText(sf))
      .join(', ');
    if (restText.includes('budgetUsd')) {
      return true;
    }
    const fourth = call.arguments[3];
    return ts.isIdentifier(fourth) && cappedDecls.has(fourth.text);
  };

  /** @param {import('typescript').CallExpression} call @returns {boolean} */
  const hasBoundMarker = (call) => {
    const start = call.getStart(sf);
    if (code.slice(start, call.getEnd()).includes(UNCAPPED_MARKER)) {
      return true;
    }
    const line = sf.getLineAndCharacterOfPosition(start).line;
    if (bodyLines[line]?.includes(UNCAPPED_MARKER)) {
      return true;
    }
    return line > 0 && bodyLines[line - 1].includes(UNCAPPED_MARKER);
  };

  // Second pass: every CallExpression at any depth whose callee is the
  // BARE identifier orchestrate or orchestratePlanned.
  /** @type {number[]} */
  const offsets = [];
  /** @param {import('typescript').Node} node */
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'orchestrate' || node.expression.text === 'orchestratePlanned') &&
      !hasRootCeiling(node) &&
      !hasBoundMarker(node)
    ) {
      offsets.push(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return offsets;
}

/**
 * Runs check 8 over one markdown document: extracts every ts/js fence
 * (same fence and language handling the check has always used) and maps
 * each offending call to its one-based markdown line number (fence
 * opener line + 1 + offset within the fence body).
 *
 * @param {string} markdownText
 * @returns {{line: number, message: string}[]}
 */
export function check8Violations(markdownText) {
  const lines = markdownText.split('\n');
  /** @type {{line: number, message: string}[]} */
  const violations = [];
  /** @type {{lang: string, start: number, body: string[]} | null} */
  let fence = null;
  lines.forEach((line, index) => {
    const opener = line.match(FENCE_LANG);
    if (opener !== null) {
      if (fence === null) {
        fence = { lang: opener[1].toLowerCase(), start: index + 1, body: [] };
        return;
      }
      const { lang, start, body } = fence;
      fence = null;
      if (!FENCE_LANGS.includes(lang)) {
        return;
      }
      for (const offset of checkOrchestrateFence(body.join('\n'))) {
        violations.push({ line: start + 1 + offset, message: CHECK8_MESSAGE });
      }
      return;
    }
    fence?.body.push(line);
  });
  return violations;
}

function main() {
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
      if (/\b(?:RunMeta|meta) is advisory\b/iu.test(line)) {
        fail(
          file,
          n,
          'RunMeta is NOT advisory as a whole: only the hash-version summary fields are ' +
            '(the store SPI contract; v1.23.0 review). Name the advisory fields precisely; ' +
            'budgetUsd, segments, argsProvided/argsHash, and the workflow binding must round-trip',
        );
      }
      if (hasArgsHashOverclaim(line)) {
        fail(file, n, ARGSHASH_OVERCLAIM_MESSAGE);
      }
      if (hasReplayOrderOverclaim(line)) {
        fail(file, n, REPLAY_ORDER_MESSAGE);
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

  // Check 5: the InvocationRole union vs the canonical roles table. The
  // union is parsed from source, not imported, so the check needs no build
  // and cannot drift behind a stale dist.
  {
    const rolesPath = join(ROOT, 'packages', 'core', 'src', 'l0', 'messages.ts');
    const agentsPath = join(ROOT, 'docs', 'guide', 'agents.md');
    const unionMatch = readFileSync(rolesPath, 'utf8').match(
      /export type InvocationRole =([^;]+);/u,
    );
    const roles =
      unionMatch === null ? [] : [...unionMatch[1].matchAll(/'([a-z-]+)'/gu)].map((m) => m[1]);
    if (roles.length === 0) {
      fail(rolesPath, 1, 'InvocationRole union not found; update the docs-lint role check');
    } else {
      const agentsDoc = readFileSync(agentsPath, 'utf8');
      for (const role of roles) {
        if (!new RegExp(`^\\| \`${role}\` \\|`, 'mu').test(agentsDoc)) {
          fail(
            agentsPath,
            1,
            `invocation role '${role}' has no canonical table row; add it to the Invocation roles table`,
          );
        }
      }
      // The reverse direction (v1.17.0 review P2): no documented role row
      // without a union member, so the table cannot invent a seventh role.
      const section = /^### Invocation roles\n(?<body>[\s\S]*?)(?=^##)/mu.exec(agentsDoc)?.groups
        ?.body;
      if (section === undefined) {
        fail(agentsPath, 1, 'Invocation roles section not found; update the docs-lint role check');
      } else {
        for (const row of section.matchAll(/^\| `(?<role>[a-z-]+)` \|/gmu)) {
          if (!roles.includes(row.groups.role)) {
            fail(
              agentsPath,
              1,
              `the Invocation roles table documents '${row.groups.role}', which is not a member ` +
                'of the InvocationRole union',
            );
          }
        }
      }
    }
  }

  // Check 6: the CLI's dynamic companions vs the package reference
  // (v1.16.2 review P3-2). The literal import('@rulvar/x') specifiers in
  // commands.ts are the source of truth; the CLI package row and the
  // dependency graph must name every one and no more. Parsed from source,
  // so the check needs no build.
  {
    const commandsPath = join(ROOT, 'packages', 'cli', 'src', 'commands.ts');
    const packagesDocPath = join(ROOT, 'docs', 'reference', 'packages.md');
    const commandsSrc = readFileSync(commandsPath, 'utf8');
    // The `...` in the analyzability comment is not [a-z-]+, so the
    // documentation placeholder import('@rulvar/...') never matches.
    const companions = [
      ...new Set([...commandsSrc.matchAll(/import\('@rulvar\/([a-z-]+)'\)/gu)].map((m) => m[1])),
    ].sort();
    if (companions.length === 0) {
      fail(
        commandsPath,
        1,
        'no dynamic companion imports found; update the docs-lint companion check',
      );
    } else {
      const doc = readFileSync(packagesDocPath, 'utf8');
      const cliRow = doc
        .split('\n')
        .find((line) => line.includes('`@rulvar/cli`') && line.includes('runCli'));
      // The dotted edges out of cli in the mermaid graph; the node id is
      // the companion name without the @rulvar/ scope.
      const edgeTargets = new Set(
        [...doc.matchAll(/cli -\.->\|[^|]*\| ([a-z-]+)/gu)].map((m) => m[1]),
      );
      for (const name of companions) {
        if (cliRow === undefined || !cliRow.includes(`\`@rulvar/${name}\``)) {
          fail(packagesDocPath, 1, `CLI package row omits the dynamic companion @rulvar/${name}`);
        }
        if (!edgeTargets.has(name)) {
          fail(packagesDocPath, 1, `dependency graph has no dotted cli edge to @rulvar/${name}`);
        }
      }
      for (const target of edgeTargets) {
        if (!companions.includes(target)) {
          fail(
            packagesDocPath,
            1,
            `dependency graph dots cli to '${target}', which commands.ts never imports`,
          );
        }
      }
    }
  }

  // Check 7: pricing snapshot literals vs the adapter exports (v1.18.0
  // review P2-4). model-routing.md cited `openai-2026-07-16` two revisions
  // after the export moved on; any dated pricingVersion literal in the
  // hand-written docs must equal the CURRENT source export for its
  // provider. Parsed from source, so the check needs no build; the
  // aggregated changelog and TypeDoc trees are already excluded, so
  // historical mentions stay legal there.
  {
    /** @type {Record<string, string>} */
    const exported = {};
    for (const provider of ['anthropic', 'openai']) {
      const capsPath = join(ROOT, 'packages', provider, 'src', 'caps.ts');
      const src = readFileSync(capsPath, 'utf8');
      const m = src.match(/pricingVersion:\s*'([^']+)'/u);
      if (m?.[1] === undefined) {
        fail(capsPath, 1, `no pricingVersion literal found; update the docs-lint pricing check`);
      } else {
        exported[provider] = m[1];
      }
    }
    const VERSION_LITERAL = /\b(anthropic|openai)-\d{4}-\d{2}-\d{2}(?:-r\d+)?\b/gu;
    for (const file of collectFiles()) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((text, index) => {
        for (const m of text.matchAll(VERSION_LITERAL)) {
          const provider = /** @type {string} */ (m[1]);
          const current = exported[provider];
          if (current !== undefined && m[0] !== current) {
            fail(
              file,
              index + 1,
              `stale pricing snapshot '${m[0]}'; the ${provider} adapter exports '${current}'`,
            );
          }
        }
      });
    }
  }

  // Check 8: per-call root-ceiling discipline in orchestration examples;
  // the rule itself lives in checkOrchestrateFence / check8Violations
  // above so the regression tests can import it without running the lint.
  {
    for (const file of collectFiles()) {
      for (const violation of check8Violations(readFileSync(file, 'utf8'))) {
        fail(file, violation.line, violation.message);
      }
    }
  }

  // Check 9: the args-binding digest overclaim, at its SOURCE (v1.24.0
  // review P2-2). The per-line sentinel above covers hand-written docs,
  // but the phrase's real origin is a TSDoc comment on RunMeta.argsHash /
  // hashRunArgs, and the generated docs/api tree that mirrors it is
  // excluded from the docs walk. So scan the public core source directly:
  // no TSDoc (or any other source line) in @rulvar/core may reintroduce
  // the claim, which is what regressed as the shipped v1.24.0 phrasing.
  {
    /** @param {string} dir @returns {string[]} */
    const walkTs = (dir) => {
      /** @type {string[]} */
      const out = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          out.push(...walkTs(full));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          out.push(full);
        }
      }
      return out;
    };
    const coreSrc = join(ROOT, 'packages', 'core', 'src');
    for (const file of walkTs(coreSrc)) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (hasArgsHashOverclaim(line)) {
            fail(file, index + 1, ARGSHASH_OVERCLAIM_MESSAGE);
          }
        });
    }
  }

  if (failures > 0) {
    console.error(`\ndocs lint failed with ${failures} problem(s)`);
    process.exit(1);
  }
  console.log('docs lint passed');
}

// Guard the CLI body: importing this module (the check 8 regression
// tests import checkOrchestrateFence and check8Violations) must not run
// the whole lint. Run only when executed directly as a script.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
