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
//  12. Package truth (RV1701): every `@rulvar/<name>` token names a real
//      workspace package; every fence import specifier resolves to a
//      real exports-map subpath; named root imports are symbols the
//      committed dts rollup exports; and the versioning fixed-group
//      list, its spelled-out size, and the two package tables stay in
//      set equality with .changeset/config.json and the manifests.
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

import { headingText, vitepressSlug } from './docs-anchors.mjs';

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

/**
 * The authentication retry overclaim sentinel (v1.33.0 review P3).
 * The Anthropic and OpenAI adapters both mark an authentication
 * failure retryable: false, and retryClassOf returns no retry class
 * for such a wire error, so it is never retried and no RetryPolicy
 * backoff is walked. The Troubleshooting guide shipped stating the
 * opposite while the Testing and adapter author guides stated the
 * runtime truth: an operational forecast built on a retry that never
 * happens. So no sentence may assert that an authentication or
 * credential failure is retried, in the passive form ("is retried
 * like a transport failure") or the active one ("the engine retries
 * an authentication failure"); negated forms ("is never retried",
 * "never retries an authentication failure") pass. The sentence
 * boundary rule matches the replay order sentinel above.
 */
const AUTH_FAILURE = /\bauthenticat|\bcredential/iu;
const AUTH_RETRY_PASSIVE =
  /\b(?:is|are|was|were|get|gets|being)\s+(?:currently\s+|always\s+)?retr(?:ied|ies)\b/iu;
const AUTH_RETRY_ACTIVE = /\bretr(?:y|ies)\s+(?:an?\s+|the\s+)?(?:authentication|credential)/iu;
const AUTH_RETRY_NEGATION = /\b(?:never|not|no longer)\s+retr/iu;
const AUTH_RETRY_MESSAGE =
  'authentication retry overclaim (v1.33.0 review P3): both first class adapters mark an ' +
  'authentication failure retryable: false and retryClassOf returns no retry class for it, so ' +
  'it is never retried and no RetryPolicy backoff is walked. State the immediate terminal ' +
  'stop instead of a retry';

/** @param {string} text @returns {boolean} */
export function hasAuthRetryOverclaim(text) {
  return text
    .split(/(?<=\.)\s+/u)
    .some(
      (sentence) =>
        AUTH_FAILURE.test(sentence) &&
        (AUTH_RETRY_PASSIVE.test(sentence) || AUTH_RETRY_ACTIVE.test(sentence)) &&
        !AUTH_RETRY_NEGATION.test(sentence),
    );
}

/**
 * The sentence sentinels applied across a whole file (v1.33.0 review
 * P3): markdown hard wraps prose, so a claim and its qualifier, or
 * the two halves of a claim, can sit on different lines of ONE
 * sentence. A per line window (the original check 10 wiring) either
 * misses that conjunction or flags a sentence its own qualifier
 * legitimizes; the shipped Troubleshooting overclaim wrapped exactly
 * that way and sailed through a per line scan. Sentences split on a
 * dot followed by whitespace, which includes the newline, so the
 * split reassembles wrapped sentences by construction; a hit reports
 * the line the sentence starts on.
 * @param {string} content
 * @returns {Array<{ line: number, message: string }>}
 */
export function overclaimSentences(content) {
  /** @type {Array<{ line: number, message: string }>} */
  const hits = [];
  /** @param {string} sentence @param {number} at */
  const judge = (sentence, at) => {
    const line = content.slice(0, at).split('\n').length;
    if (hasReplayOrderOverclaim(sentence)) {
      hits.push({ line, message: REPLAY_ORDER_MESSAGE });
    }
    if (hasAuthRetryOverclaim(sentence)) {
      hits.push({ line, message: AUTH_RETRY_MESSAGE });
    }
  };
  let start = 0;
  for (const match of content.matchAll(/(?<=\.)\s+/gu)) {
    const at = match.index ?? 0;
    judge(content.slice(start, at), start);
    start = at + match[0].length;
  }
  judge(content.slice(start), start);
  return hits;
}

/**
 * The exactly-once claim sentinel (RV508, the ninth-experiment
 * review). SECURITY.md declares tool execution at-least-once: a crash
 * between a tool's execution and the turn-boundary checkpoint re-runs
 * the tool, and idempotency is the tool author's responsibility. The
 * isolated-executor guide nevertheless shipped "each ran once" and the
 * tools guide "executes exactly once": two contracts for one runtime,
 * found by the ninth comparison experiment's judge. So the phrase
 * "exactly once" (or "exactly-once") is forbidden in the hand-written
 * docs and in package source COMMENTS unless the hit sits in a vetted
 * registry section: the durability guide's pay doctrine (exactly-once
 * PAY is true and is the never-pay-twice invariant) and the guarantee
 * matrix (which exists to say which layer provides what). The
 * allowlist binds (file, heading anchor) pairs, so an exemption cannot
 * silently legitimize a new claim in another section or file. Sources
 * are judged on comment lines only (line-leading `//`, `*`, or `/*`):
 * string literals stay untouched because tool descriptions enter the
 * toolset hash and assertion messages are runtime text, not claims.
 */
const EXACTLY_ONCE = /\bexactly[ -]once\b/iu;
/** The prior shipped recurrence of the same claim (RV612). */
const EACH_RAN_ONCE = /\beach ran once\b/iu;
/** True when the (already whitespace-normalized) text carries the claim. */
/** @param {string} text @returns {boolean} */
const claimIn = (text) => EXACTLY_ONCE.test(text) || EACH_RAN_ONCE.test(text);
const EXACTLY_ONCE_MESSAGE =
  'exactly-once claim (RV508, the ninth-experiment review): tool execution is at-least-once ' +
  '(SECURITY.md: a crash between execution and the turn-boundary checkpoint re-runs the tool), ' +
  'and no doc or source comment may claim exactly-once semantics outside the vetted registry ' +
  '(the durability pay doctrine and the guarantee matrix). State the precise guarantee instead: ' +
  'the single continuation of a settled run, never-pay-twice, or at-least-once with attempt ' +
  'binding; extend the allowlist only for a claim that is literally true';
/** @type {Map<string, Set<string>>} */
const EXACTLY_ONCE_ALLOWLIST = new Map([
  ['guide/durability.md', new Set(['at-least-once-dispatch-exactly-once-pay'])],
  ['guide/isolated-executor.md', new Set(['the-guarantee-matrix', 'what-the-ledger-is-not'])],
  // The production-profiles page repeats the ledger's denial list
  // verbatim (a negation, not a claim), inside its isolated-patch
  // posture.
  ['guide/production-profiles.md', new Set(['isolated-patch'])],
]);
const COMMENT_LINE = /^\s*(?:\/\/|\/?\*)/u;

/**
 * The heading slug, from the ONE slug rule in this repository
 * (RV2704). This file used to carry its own approximation (lowercase,
 * punctuation dropped, spaces to hyphens), which differs from
 * VitePress on any heading with punctuation: `children's` anchors as
 * `children-s`, not `childrens`. The allowlist below binds (file,
 * anchor) pairs, so an approximate slug would silently stop matching
 * its vetted section and turn an exemption into a failure.
 * @param {string} heading @returns {string}
 */
function headingSlug(heading) {
  return vitepressSlug(headingText(heading));
}

/**
 * Scans one file for forbidden exactly-once claims. Markdown files
 * track the current heading so the (file, anchor) allowlist can admit
 * the vetted sections (the heading line itself sits under its own
 * anchor); `.ts` files are judged on comment lines only.
 * @param {string} content
 * @param {string} relPath POSIX-style path relative to docs/ (markdown) or the repo root (sources)
 * @returns {Array<{ line: number, message: string }>}
 */
export function exactlyOnceHits(content, relPath) {
  return sentinelHits(content, relPath, {
    claimIn,
    message: EXACTLY_ONCE_MESSAGE,
    allowlist: EXACTLY_ONCE_ALLOWLIST,
  });
}

/**
 * The in-process-only executor claim sentinel (RV2905, the ninth
 * comparison experiment's independent audit). The claim "the current
 * release enforces only the in-process tool executor" was fixed once
 * on the architecture page and survived on two other pages, where the
 * audit found it contradicting `EngineOptions.executors` and the
 * shipped `@rulvar/executor` references. A claim class that returned
 * after its fix gets a tombstone: the phrase is forbidden everywhere
 * this lint reads, because the true statement names the seam (a
 * non-inprocess tag is a typed ConfigError until a provider is
 * registered) instead of denying the packages that fill it.
 */
const IN_PROCESS_ONLY = /\bonly the in[ -]?process (?:tool )?executor\b/iu;
const IN_PROCESS_ONLY_MESSAGE =
  'in-process-only executor claim (RV2905): the release ships subprocess and container ' +
  'references in @rulvar/executor behind the EngineOptions.executors seam, and this claim ' +
  'already returned once after being fixed on the architecture page. State the seam instead: ' +
  'the core alone refuses a non-inprocess executor tag as a typed ConfigError at spawn time ' +
  'until a matching ToolExecutorProvider is registered';

/**
 * Scans one file for the revived in-process-only executor claim; the
 * same walk and block-joining as {@link exactlyOnceHits}, with no
 * allowlist, because no section is vetted to make this claim.
 * @param {string} content
 * @param {string} relPath POSIX-style path relative to docs/ (markdown) or the repo root (sources)
 * @returns {Array<{ line: number, message: string }>}
 */
export function inProcessExecutorHits(content, relPath) {
  return sentinelHits(content, relPath, {
    claimIn: (text) => IN_PROCESS_ONLY.test(text),
    message: IN_PROCESS_ONLY_MESSAGE,
  });
}

/**
 * The shared sentinel scanner behind the claim tombstones above:
 * per-line hits first, then the block pass that joins wrapped prose
 * (markdown paragraphs, comment blocks) so a claim split across lines
 * is still one published claim.
 * @param {string} content
 * @param {string} relPath POSIX-style path relative to docs/ (markdown) or the repo root (sources)
 * @param {{ claimIn: (text: string) => boolean, message: string, allowlist?: Map<string, Set<string>> }} sentinel
 * @returns {Array<{ line: number, message: string }>}
 */
function sentinelHits(content, relPath, sentinel) {
  /** @type {Array<{ line: number, message: string }>} */
  const hits = [];
  const lines = content.split('\n');
  const isSource = relPath.endsWith('.ts');
  const allowedAnchors = sentinel.allowlist?.get(relPath);
  let currentAnchor = '';
  /** Lines that already produced a per-line hit, so the block pass
   * never double-reports the same occurrence. */
  const lineHits = new Set();
  lines.forEach((text, index) => {
    if (!isSource) {
      const heading = /^#{1,6}\s+(.*)$/u.exec(text);
      if (heading?.[1] !== undefined) {
        currentAnchor = headingSlug(heading[1]);
      }
    }
    if (!sentinel.claimIn(text.replace(/\s+/gu, ' '))) {
      return;
    }
    if (isSource && !COMMENT_LINE.test(text)) {
      return;
    }
    if (!isSource && allowedAnchors?.has(currentAnchor) === true) {
      return;
    }
    lineHits.add(index);
    hits.push({ line: index + 1, message: sentinel.message });
  });
  // The block pass (RV612): markdown renders an ordinary newline as
  // whitespace, so a claim wrapped between two lines of one paragraph
  // (or one comment block) is the SAME published claim. Contiguous
  // prose lines (markdown: non-blank, non-heading lines under one
  // anchor; sources: consecutive comment lines with their markers
  // stripped) are joined, whitespace collapsed, and judged as one text;
  // a hit reports the block's first line. Blocks whose lines already
  // produced a per-line hit stay silent, so an occurrence is reported
  // once, at its most precise location.
  currentAnchor = '';
  /** @type {{ start: number, parts: string[], anchor: string, hit: boolean } | undefined} */
  let block;
  const flush = () => {
    if (block === undefined) {
      return;
    }
    const { start, parts, anchor, hit } = block;
    block = undefined;
    if (hit) {
      return;
    }
    if (!isSource && allowedAnchors?.has(anchor) === true) {
      return;
    }
    if (sentinel.claimIn(parts.join(' ').replace(/\s+/gu, ' '))) {
      hits.push({ line: start + 1, message: sentinel.message });
    }
  };
  lines.forEach((text, index) => {
    if (!isSource) {
      const heading = /^#{1,6}\s+(.*)$/u.exec(text);
      if (heading?.[1] !== undefined) {
        currentAnchor = headingSlug(heading[1]);
        flush();
        return;
      }
      if (text.trim() === '') {
        flush();
        return;
      }
      block ??= { start: index, parts: [], anchor: currentAnchor, hit: false };
      block.parts.push(text);
      block.hit ||= lineHits.has(index);
      return;
    }
    if (!COMMENT_LINE.test(text)) {
      flush();
      return;
    }
    // Strip the comment scaffolding so a claim wrapped across ' * '
    // continuation lines joins into ordinary prose.
    const prose = text.replace(/^\s*(?:\/\/|\/\*+|\*+\/|\*)\s?/u, '').replace(/\*+\/\s*$/u, '');
    block ??= { start: index, parts: [], anchor: '', hit: false };
    block.parts.push(prose);
    block.hit ||= lineHits.has(index);
  });
  flush();
  return hits.sort((a, b) => a.line - b.line);
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

// Check 12 machinery (RV1701): package truth. The eighteenth comparison
// benchmark's strongest documentation-class failure was package identity
// conflation: a due-diligence dossier described `@rulvar/plan` with a
// citation into `packages/planner` and nothing mechanical objected. The
// docs cannot stop a reader's model from confusing two names, but they
// can refuse to ship a single byte that gets the universe wrong
// themselves. Four layers, each against a build artifact rather than
// prose: every `@rulvar/<name>` token in every page must name a real
// workspace package; every import/require/export-from specifier in a
// ts/js fence must resolve to a real exports-map subpath of its package;
// every NAMED root import in a fence must be a symbol the package's
// committed dts rollup actually exports (this is the layer that turns
// `import { planRunner } from '@rulvar/planner'` into a lint failure
// instead of a shipped falsehood); and the versioning page's fixed-group
// list, spelled-out group size, and the two package tables must stay in
// set-equality with .changeset/config.json and the publishable
// manifests, so "the full package list" cannot silently drop a package
// (it had: store-postgres and executor were missing when this check
// first ran).

/**
 * Spelled-out group sizes for the parity check, total over every
 * realistic size so the check can never silently skip; index 0 unused.
 * @type {readonly string[]}
 */
const COUNT_WORDS = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

/**
 * A scoped package name token. Hyphenated lowercase only: every real
 * name fits, and a sentence-final period after `@rulvar/compat.` must
 * not be captured into the name.
 */
const PKG_TOKEN = /@rulvar\/[a-z0-9][a-z0-9-]*/gu;

/**
 * Exported names of one committed dts rollup: the union of every
 * `export { ... }` block (renames export the post-`as` name, `type`
 * prefixes stripped) plus the transitive closure over
 * `export * from "@rulvar/x"` lines (the umbrella re-exports core this
 * way). Returns null when the rollup file is absent, which downgrades
 * the symbol layer to "unknown" without failing the name and subpath
 * layers.
 *
 * @param {string} pkgName
 * @param {Set<string>} [seen]
 * @returns {Set<string> | null}
 */
export function rollupExportedNames(pkgName, seen = new Set()) {
  if (seen.has(pkgName)) return new Set();
  seen.add(pkgName);
  const base = pkgName === 'rulvar' ? 'rulvar' : pkgName.replace('@rulvar/', '');
  /** @type {string} */
  let text;
  try {
    text = readFileSync(join(ROOT, 'dts-rollup', `${base}.d.ts`), 'utf8');
  } catch {
    return null;
  }
  const names = new Set();
  for (const block of text.matchAll(/export\s+(?:type\s+)?\{(?<body>[^}]*)\}/gu)) {
    for (const raw of block.groups.body.split(',')) {
      const entry = raw.trim();
      if (entry === '') continue;
      const renamed = entry.match(/\bas\s+(?<name>[A-Za-z_$][\w$]*)\s*$/u);
      const plain = entry.match(/^(?:type\s+)?(?<name>[A-Za-z_$][\w$]*)$/u);
      const name = renamed?.groups?.name ?? plain?.groups?.name;
      if (name !== undefined) names.add(name);
    }
  }
  for (const star of text.matchAll(/export\s+\*\s+from\s+["'](?<spec>[^"']+)["']/gu)) {
    const spec = star.groups.spec;
    if (!spec.startsWith('@rulvar/') && spec !== 'rulvar') continue;
    const nested = rollupExportedNames(spec, seen);
    if (nested === null) return null;
    for (const name of nested) names.add(name);
  }
  return names;
}

/**
 * The package universe: every workspace manifest (packages/* plus the
 * root pointer/ dir) keyed by published name, with its exports-map
 * subpaths and, for publishable packages, the dts-rollup symbol set.
 * The pointer re-exports the umbrella one to one, so its symbol set is
 * the umbrella's.
 *
 * @returns {Map<string, {dir: string, private: boolean, exportSubpaths: Set<string>, symbols: Set<string> | null}>}
 */
export function loadPackageUniverse() {
  /** @type {Map<string, {dir: string, private: boolean, exportSubpaths: Set<string>, symbols: Set<string> | null}>} */
  const byName = new Map();
  const dirs = readdirSync(join(ROOT, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join('packages', entry.name));
  // The workspace members living outside packages/: the npm pointer and
  // the two private workspaces whose names legitimately appear in the
  // contributor-facing pages.
  dirs.push('pointer', 'docs', 'examples');
  for (const dir of dirs) {
    /** @type {{name?: string, private?: boolean, exports?: Record<string, unknown>}} */
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    if (typeof manifest.name !== 'string') continue;
    byName.set(manifest.name, {
      dir,
      private: manifest.private === true,
      exportSubpaths: new Set(Object.keys(manifest.exports ?? {})),
      symbols: null,
    });
  }
  for (const [name, info] of byName) {
    if (info.private) continue;
    info.symbols = rollupExportedNames(name === 'rulvar' ? '@rulvar/rulvar' : name);
  }
  return byName;
}

/**
 * Import bindings of one ts/js fence body, AST-parsed exactly like
 * check 8 (lenient, never type-checked): static imports (named bindings
 * collected, pre-rename names), export-from, require('x'), and dynamic
 * import('x'). Offsets are zero-based lines within the fence body.
 *
 * @param {string} code
 * @returns {{specifier: string, names: string[], offset: number}[]}
 */
export function fenceImportBindings(code) {
  /** @type {import('typescript').SourceFile | undefined} */
  let source;
  try {
    source = ts.createSourceFile('fence.ts', code, ts.ScriptTarget.Latest);
  } catch {
    source = undefined;
  }
  if (source === undefined) return [];
  const sf = source;
  /** @type {{specifier: string, names: string[], offset: number}[]} */
  const out = [];
  /** @param {import('typescript').Node} node @param {string} specifier @param {string[]} names */
  const push = (node, specifier, names) => {
    out.push({
      specifier,
      names,
      offset: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line,
    });
  };
  /** @param {import('typescript').Node} node */
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      /** @type {string[]} */
      const names = [];
      const bindings = node.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          names.push((element.propertyName ?? element.name).text);
        }
      }
      push(node, node.moduleSpecifier.text, names);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      push(node, node.moduleSpecifier.text, []);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isRequire = ts.isIdentifier(callee) && callee.text === 'require';
      const isDynamicImport = callee.kind === ts.SyntaxKind.ImportKeyword;
      if (
        (isRequire || isDynamicImport) &&
        node.arguments.length >= 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        push(node, node.arguments[0].text, []);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/**
 * Check 12, fence layer: every Rulvar specifier in a fence resolves to
 * a known package, a real exports subpath, and (for named root imports,
 * when the rollup is available) real exported symbols.
 *
 * @param {string} code the fence body
 * @param {Map<string, {exportSubpaths: Set<string>, symbols: Set<string> | null}>} universe
 * @returns {{offset: number, message: string}[]}
 */
export function packageImportViolations(code, universe) {
  /** @type {{offset: number, message: string}[]} */
  const violations = [];
  for (const binding of fenceImportBindings(code)) {
    const spec = binding.specifier;
    const isRulvar =
      spec === 'rulvar' ||
      spec.startsWith('rulvar/') ||
      spec === 'eslint-plugin-rulvar' ||
      spec.startsWith('eslint-plugin-rulvar/') ||
      spec.startsWith('@rulvar/');
    if (!isRulvar) continue;
    const pkgName = spec.startsWith('@rulvar/')
      ? spec.split('/').slice(0, 2).join('/')
      : spec.split('/')[0];
    const info = universe.get(pkgName);
    if (info === undefined) {
      violations.push({
        offset: binding.offset,
        message: `import from unknown package '${pkgName}'; no workspace manifest publishes that name`,
      });
      continue;
    }
    const subpath = spec === pkgName ? '.' : `./${spec.slice(pkgName.length + 1)}`;
    if (!info.exportSubpaths.has(subpath)) {
      violations.push({
        offset: binding.offset,
        message:
          `'${spec}': subpath '${subpath}' is not in ${pkgName}'s exports map; ` +
          `the package exposes: ${[...info.exportSubpaths].join(', ')}`,
      });
      continue;
    }
    if (subpath === '.' && binding.names.length > 0 && info.symbols !== null) {
      for (const name of binding.names) {
        if (!info.symbols.has(name)) {
          violations.push({
            offset: binding.offset,
            message:
              `'${name}' is not exported by ${pkgName} (per its committed dts rollup); ` +
              `if the symbol lives in a sibling package, import from that package ` +
              `(@rulvar/plan and @rulvar/planner are distinct)`,
          });
        }
      }
    }
  }
  return violations;
}

/**
 * Check 12, prose layer: every `@rulvar/<name>` token anywhere in a
 * page (prose and fences alike) must name a real workspace package, so
 * a typo or a nonexistent package cannot be documented into existence.
 *
 * @param {string} markdownText
 * @param {Set<string>} knownNames
 * @returns {{line: number, token: string}[]}
 */
export function unknownPackageTokens(markdownText, knownNames) {
  /** @type {{line: number, token: string}[]} */
  const hits = [];
  markdownText.split('\n').forEach((lineText, index) => {
    for (const match of lineText.matchAll(PKG_TOKEN)) {
      if (!knownNames.has(match[0])) {
        hits.push({ line: index + 1, token: match[0] });
      }
    }
  });
  return hits;
}

/**
 * Check 12, per-file wiring: prose tokens plus per-fence import
 * resolution, fence-split exactly like check8Violations.
 *
 * @param {string} markdownText
 * @param {Map<string, {exportSubpaths: Set<string>, symbols: Set<string> | null}>} universe
 * @returns {{line: number, message: string}[]}
 */
export function packageTruthViolations(markdownText, universe) {
  /** @type {{line: number, message: string}[]} */
  const violations = [];
  for (const hit of unknownPackageTokens(markdownText, new Set(universe.keys()))) {
    violations.push({
      line: hit.line,
      message: `unknown package name '${hit.token}'; no workspace manifest publishes that name`,
    });
  }
  const lines = markdownText.split('\n');
  /** @type {{lang: string, start: number, body: string[]} | null} */
  let fence = null;
  lines.forEach((lineText, index) => {
    const opener = lineText.match(FENCE_LANG);
    if (opener !== null) {
      if (fence === null) {
        fence = { lang: opener[1].toLowerCase(), start: index + 1, body: [] };
        return;
      }
      const { lang, start, body } = fence;
      fence = null;
      if (!FENCE_LANGS.includes(lang)) return;
      for (const violation of packageImportViolations(body.join('\n'), universe)) {
        violations.push({ line: start + 1 + violation.offset, message: violation.message });
      }
      return;
    }
    fence?.body.push(lineText);
  });
  return violations;
}

/**
 * Check 12, cross-file layer: the versioning page's fixed-group list
 * line must be in set equality with .changeset/config.json, its
 * spelled-out size must match the group's actual size, and the two
 * package tables must carry a row for every publishable package plus
 * the pointer.
 *
 * @param {{versioningText: string, packagesText: string, installationText: string, fixedGroup: string[]}} input
 * @returns {{file: 'versioning' | 'packages' | 'installation', message: string}[]}
 */
export function packageParityViolations(input) {
  /** @type {{file: 'versioning' | 'packages' | 'installation', message: string}[]} */
  const violations = [];
  const { versioningText, packagesText, installationText, fixedGroup } = input;

  const groupMarker = 'The group is:';
  const markerIndex = versioningText.indexOf(groupMarker);
  const listLine =
    markerIndex < 0
      ? undefined
      : versioningText
          .slice(markerIndex)
          .split('\n')
          .map((lineText) => lineText.trim())
          .find((lineText) => lineText !== '' && !lineText.startsWith(groupMarker));
  if (listLine === undefined) {
    violations.push({
      file: 'versioning',
      message: `fixed-group list not found (marker '${groupMarker}'); update the parity check`,
    });
  } else {
    const listed = new Set(
      [
        ...[...listLine.matchAll(PKG_TOKEN)].map((match) => match[0]),
        ...(listLine.includes('eslint-plugin-rulvar') ? ['eslint-plugin-rulvar'] : []),
      ].filter((name) => name !== '@rulvar/compat'),
    );
    for (const name of fixedGroup) {
      if (!listed.has(name)) {
        violations.push({
          file: 'versioning',
          message: `fixed-group member ${name} is missing from the group list`,
        });
      }
    }
    for (const name of listed) {
      if (!fixedGroup.includes(name)) {
        violations.push({
          file: 'versioning',
          message: `group list names ${name}, which is not in .changeset/config.json's fixed group`,
        });
      }
    }
  }
  const sizeWord = COUNT_WORDS[fixedGroup.length];
  if (sizeWord === undefined || sizeWord === '') {
    violations.push({
      file: 'versioning',
      message: `the fixed group has ${String(fixedGroup.length)} packages, outside the spelled-out size table; extend COUNT_WORDS`,
    });
  } else if (!versioningText.includes(`(${sizeWord} packages)`)) {
    violations.push({
      file: 'versioning',
      message: `the fixed group has ${String(fixedGroup.length)} packages; the policy table must say '(${sizeWord} packages)'`,
    });
  }

  const publishable = [...fixedGroup, '@rulvar/compat'];
  for (const name of publishable) {
    if (!new RegExp(`^\\| \\[\`${name}\`\\]\\(/api/`, 'mu').test(packagesText)) {
      violations.push({
        file: 'packages',
        message: `package table has no row for ${name}`,
      });
    }
    if (!new RegExp(`^\\| \`${name}\` \\|`, 'mu').test(installationText)) {
      violations.push({
        file: 'installation',
        message: `the full package list has no row for ${name}`,
      });
    }
  }
  if (!/^\| `rulvar` \(unscoped\) \|/mu.test(packagesText)) {
    violations.push({
      file: 'packages',
      message: 'package table has no row for the unscoped rulvar pointer',
    });
  }
  return violations;
}

function main() {
  const packageUniverse = loadPackageUniverse();
  for (const file of collectFiles()) {
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    let inFence = false;
    let h1Count = 0;

    // Checks 10 and 11 judge whole sentences, not lines: markdown
    // wraps a sentence across lines, and the conjunction the
    // predicates test for must not be split by the wrap.
    for (const hit of overclaimSentences(text)) {
      fail(file, hit.line, hit.message);
    }

    // Check 12: package truth, per file (prose tokens + fence imports).
    for (const hit of packageTruthViolations(text, packageUniverse)) {
      fail(file, hit.line, hit.message);
    }

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

  // Check 12, cross-file: fixed-group parity and package-table
  // completeness against .changeset/config.json and the manifests.
  {
    const versioningPath = join(ROOT, 'docs', 'reference', 'versioning.md');
    const packagesPath = join(ROOT, 'docs', 'reference', 'packages.md');
    const installationPath = join(ROOT, 'docs', 'guide', 'installation.md');
    /** @type {{fixed: string[][]}} */
    const changesetConfig = JSON.parse(
      readFileSync(join(ROOT, '.changeset', 'config.json'), 'utf8'),
    );
    const fixedGroup = changesetConfig.fixed[0];
    for (const name of fixedGroup) {
      if (!packageUniverse.has(name)) {
        fail(
          join(ROOT, '.changeset', 'config.json'),
          1,
          `fixed group names ${name}, but no workspace manifest publishes that name`,
        );
      }
    }
    const pathFor = {
      versioning: versioningPath,
      packages: packagesPath,
      installation: installationPath,
    };
    for (const violation of packageParityViolations({
      versioningText: readFileSync(versioningPath, 'utf8'),
      packagesText: readFileSync(packagesPath, 'utf8'),
      installationText: readFileSync(installationPath, 'utf8'),
      fixedGroup,
    })) {
      fail(pathFor[violation.file], 1, violation.message);
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

  // Check 11: the cookbook page and the cookbook corpus stay bound
  // (RV-212). Every examples/src/cookbook-*.ts recipe must be linked
  // from docs/guide/cookbook.md, and every cookbook-*.ts link on the
  // page must resolve to an existing recipe file, so the rendered
  // cookbook can never drift from the tested corpus.
  {
    const cookbookPage = join(ROOT, 'docs', 'guide', 'cookbook.md');
    const examplesDir = join(ROOT, 'examples', 'src');
    const pageText = readFileSync(cookbookPage, 'utf8');
    const recipeFiles = readdirSync(examplesDir).filter(
      (name) => name.startsWith('cookbook-') && name.endsWith('.ts') && !name.endsWith('.test.ts'),
    );
    for (const name of recipeFiles) {
      if (!pageText.includes(name)) {
        fail(cookbookPage, 1, `cookbook recipe ${name} is not linked from the cookbook page`);
      }
    }
    const linked = [...pageText.matchAll(/cookbook-[a-z-]+\.ts/g)].map((match) => match[0]);
    for (const name of new Set(linked)) {
      if (!recipeFiles.includes(name)) {
        fail(
          cookbookPage,
          1,
          `the cookbook page links ${name}, which does not exist in examples/src`,
        );
      }
    }
  }

  // Check 12: the exactly-once claim sentinel (RV508); the rule lives
  // in exactlyOnceHits above so the regression tests can import it.
  // Hand-written docs (the same walk every sentinel uses: docs/api and
  // the aggregated changelog are already excluded) plus the COMMENT
  // lines of every package's non-test sources, the check 9 shape
  // widened to all packages.
  {
    const docsRoot = join(ROOT, 'docs');
    for (const file of collectFiles()) {
      const rel = relative(docsRoot, file).split(sep).join('/');
      const content = readFileSync(file, 'utf8');
      for (const hit of exactlyOnceHits(content, rel)) {
        fail(file, hit.line, hit.message);
      }
      for (const hit of inProcessExecutorHits(content, rel)) {
        fail(file, hit.line, hit.message);
      }
    }
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
    const packagesDir = join(ROOT, 'packages');
    for (const pkg of readdirSync(packagesDir, { withFileTypes: true })) {
      if (!pkg.isDirectory()) {
        continue;
      }
      const srcDir = join(packagesDir, pkg.name, 'src');
      /** @type {string[]} */
      let sources;
      try {
        sources = walkTs(srcDir);
      } catch {
        continue;
      }
      for (const file of sources) {
        if (file.endsWith('.test.ts')) {
          continue;
        }
        const rel = relative(ROOT, file).split(sep).join('/');
        const content = readFileSync(file, 'utf8');
        for (const hit of exactlyOnceHits(content, rel)) {
          fail(file, hit.line, hit.message);
        }
        for (const hit of inProcessExecutorHits(content, rel)) {
          fail(file, hit.line, hit.message);
        }
      }
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
