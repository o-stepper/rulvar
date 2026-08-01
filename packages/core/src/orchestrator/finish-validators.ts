/**
 * Deterministic host validation of the orchestrator finish result (the
 * v1.40.0 improvement plan's RV-204 slice). A validator is plain
 * synchronous host code judging the finish({ result }) argument; the
 * orchestrator runtime runs the configured set on every schema valid
 * finish call, returns the failure reasons to the model as the call's
 * error tool result (a bounded repair turn), and fails the run with a
 * typed error when the repair bound is exhausted. Verdicts journal as
 * decision entries, so a resume rolls the SAME verdicts forward without
 * re-running validator code.
 */
import { ConfigError } from '../l0/errors.js';
import type { Json } from '../l0/json.js';

/**
 * One child as the finish validators see it (the RV-202 provenance
 * contract): a pure read of the durable state the orchestrator already
 * tracks, identical live and on replay.
 */
export interface FinishValidationChild {
  /** The spawn handle (the journal seq, stable across resume). */
  readonly handle: number;
  /** The child's node identity, the same one acceptance reasons use. */
  readonly nodeId: string;
  /** The terminal status, or 'running' for a child unsettled at finish time. */
  readonly status: string;
  /**
   * The child's full output serialized (a raw string verbatim, anything
   * else JSON; a failed child's errorMessage), '' while unsettled. The
   * same serialization the child result evidence tools page.
   */
  readonly text: string;
  /**
   * Present and true ONLY when acceptance.acceptValidatedTerminalOutputOnLimit
   * is configured and this child settled 'limit' CARRYING a terminal
   * output (the finalization reserve summary that, for a schema child,
   * already validated against the declared output schema). Acceptance
   * will count such a child as a success, so evidencePreservedValidator
   * treats its text as part of the cited evidence pool. Absent in every
   * other configuration, keeping the old pool exactly.
   */
  readonly salvageableOutput?: boolean;
}

/** What a {@link FinishValidator} judges. */
export interface FinishValidationInput {
  /** The finish call's `result` argument exactly as the model passed it. */
  readonly result: Json | null;
  /**
   * The result as text: a string result verbatim, anything else its JSON
   * serialization (the same convention the child result evidence tools
   * use), so textual validators never re-implement serialization.
   */
  readonly text: string;
  /**
   * Every spawned child at finish time, in spawn order (the RV-202
   * provenance contract). Optional in the TYPE only so hand built
   * inputs stay source compatible; the orchestrator runtime always
   * supplies it, so validators can hold the finish result against the
   * evidence the children actually produced.
   */
  readonly children?: readonly FinishValidationChild[];
}

/** The verdict of one validator over one finish attempt. */
export type FinishValidationVerdict = { ok: true } | { ok: false; reasons: string[] };

/**
 * A deterministic host validator of the orchestrator finish result.
 * `validate` must be pure, synchronous host code: no model calls, no
 * clock, no filesystem, because a verdict must reproduce on replay and a
 * throwing validator is a host defect that fails the run as ConfigError
 * (never journaled, never granted a repair turn).
 */
export interface FinishValidator {
  /**
   * Unique within one orchestrate call; appears in the journaled
   * verdicts, the repair feedback, and the orchestrator prompt.
   */
  readonly name: string;
  validate(input: FinishValidationInput): FinishValidationVerdict;
}

const ok: FinishValidationVerdict = { ok: true };

function requireNonEmptyStrings(values: unknown, what: string): string[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new ConfigError(`${what} must be a non empty array of strings`);
  }
  for (const value of values) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new ConfigError(`${what} must contain only non empty strings`);
    }
  }
  // A defensive copy: the validator must not change behavior when the
  // caller later mutates (or has frozen) the array it passed in.
  return [...(values as string[])];
}

/**
 * How section markers must appear in the judged text (cycle 74):
 * 'anywhere' is the historical substring test; 'line' demands the
 * marker as its own line (surrounding whitespace ignored), so a
 * mid sentence mention or a quoted marker no longer satisfies a
 * heading requirement.
 */
export type SectionMatchMode = 'anywhere' | 'line';

/**
 * Whether fenced code participates in textual validation (cycle 74):
 * 'counted' is the historical behavior; 'excluded' removes fenced code
 * blocks (see {@link stripFencedBlocks}) before matching, counting, or
 * slicing, so code samples can neither satisfy a section marker nor
 * inflate word and citation counts.
 */
export type FencedCodeMode = 'counted' | 'excluded';

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*\r?$/;

/**
 * Removes fenced code blocks from a text, the delimiter lines
 * included, and returns the remaining lines joined by newlines. The
 * grammar is the CommonMark shape as a deliberate line heuristic: a
 * fence opens at a line starting (after at most three spaces) with
 * three or more backticks or tildes, an optional info string allowed;
 * it closes at the next line carrying only at least as many of the
 * SAME character (a trailing carriage return from CRLF text does not
 * keep a fence open); an unclosed fence runs to the end of the text.
 * Indented (four space) code blocks are not treated as code. This is
 * the exact exclusion the `fencedCode: 'excluded'` validator option
 * applies, exported so custom host validators can stay symmetric.
 */
export function stripFencedBlocks(text: string): string {
  const kept: string[] = [];
  let fence: { char: string; length: number } | undefined;
  for (const line of text.split('\n')) {
    if (fence === undefined) {
      const open = FENCE_OPEN.exec(line);
      const delimiter = open?.[1];
      if (delimiter !== undefined) {
        fence = { char: delimiter.charAt(0), length: delimiter.length };
        continue;
      }
      kept.push(line);
      continue;
    }
    const close = FENCE_CLOSE.exec(line)?.[1];
    if (close !== undefined && close.charAt(0) === fence.char && close.length >= fence.length) {
      fence = undefined;
    }
  }
  return kept.join('\n');
}

function requireSectionMatchMode(value: unknown, what: string): SectionMatchMode {
  if (value !== 'anywhere' && value !== 'line') {
    throw new ConfigError(`${what} must be 'anywhere' or 'line'; got ${String(value)}`);
  }
  return value;
}

function requireFencedCodeMode(value: unknown, what: string): FencedCodeMode {
  if (value !== 'counted' && value !== 'excluded') {
    throw new ConfigError(`${what} must be 'counted' or 'excluded'; got ${String(value)}`);
  }
  return value;
}

/**
 * The first position of a section marker in the (already fence
 * filtered) scope under the configured match mode: the plain substring
 * offset for 'anywhere', the offset of the first line whose trimmed
 * content EQUALS the marker for 'line'; -1 when absent. One shared
 * primitive so presence checks and slice anchoring can never disagree.
 */
function sectionPosition(scope: string, section: string, match: SectionMatchMode): number {
  if (match === 'anywhere') {
    return scope.indexOf(section);
  }
  let offset = 0;
  for (const line of scope.split('\n')) {
    if (line.trim() === section) {
      return offset;
    }
    offset += line.length + 1;
  }
  return -1;
}

/**
 * The deterministic host half of sectional bounded repair (RV808b): a
 * rejected finish used to resend the WHOLE document to fix one violated
 * section, and the twelfth comparison run paid its post-fan-in wall
 * exactly that way. This function reconstructs the full document from
 * the RETAINED prior attempt and a sectional resubmission. The grammar
 * is line anchored on purpose (the {@link SectionMatchMode} 'line'
 * semantics): a section starts at the first line whose trimmed content
 * EQUALS a declared marker and runs to the next such marker line (any
 * declared marker) or the end of the text; the preamble before the
 * first marker is retained verbatim. A patched marker present in the
 * prior text has its whole section replaced by the marker line plus the
 * new body; a patched marker absent from the prior text is APPENDED at
 * the end in declared order (that is how a repair ADDS a section a
 * validator demanded). A patch naming an undeclared marker is a
 * ConfigError: the caller owns turning that into repair feedback.
 * Deterministic and pure, so a spliced exchange recounts identically on
 * replay; exported so custom hosts can stay symmetric with the
 * orchestrator runtime.
 */
export function spliceSections(
  prior: string,
  declared: readonly string[],
  patch: Readonly<Record<string, string>>,
): string {
  const sections = requireNonEmptyStrings(declared, 'spliceSections declared sections');
  // Own entries only: a JSON-parsed patch can carry prototype-shaped
  // keys ('constructor', '__proto__'), and a bare index lookup would
  // resolve them to inherited values instead of refusing them.
  const bodies = new Map(Object.entries(patch));
  for (const marker of bodies.keys()) {
    if (!sections.includes(marker)) {
      throw new ConfigError(
        `spliceSections patch names an undeclared section '${marker}'; declared: ` +
          sections.join(', '),
      );
    }
  }
  const anchors: { marker: string; at: number }[] = [];
  for (const marker of sections) {
    const at = sectionPosition(prior, marker, 'line');
    if (at >= 0) {
      anchors.push({ marker, at });
    }
  }
  anchors.sort((a, b) => a.at - b.at);
  let out = '';
  let cursor = 0;
  for (const [index, anchor] of anchors.entries()) {
    const end =
      index + 1 < anchors.length ? (anchors[index + 1]?.at ?? prior.length) : prior.length;
    out += prior.slice(cursor, anchor.at);
    const body = bodies.get(anchor.marker);
    if (body === undefined) {
      out += prior.slice(anchor.at, end);
    } else {
      out += `${anchor.marker}\n${body}`;
      // The replaced slice carried the separator up to the next
      // section; a body without a trailing newline must not glue the
      // following marker onto its last line.
      if (end < prior.length && !body.endsWith('\n')) {
        out += '\n';
      }
    }
    cursor = end;
  }
  out += prior.slice(cursor);
  const anchored = new Set(anchors.map((anchor) => anchor.marker));
  for (const marker of sections) {
    const body = bodies.get(marker);
    if (anchored.has(marker) || body === undefined) {
      continue;
    }
    if (out.length > 0 && !out.endsWith('\n')) {
      out += '\n';
    }
    out += `${marker}\n${body}`;
  }
  return out;
}

function missingSectionQualifier(match: SectionMatchMode, fencedCode: FencedCodeMode): string {
  const demands =
    (match === 'line' ? ' as its own line' : '') +
    (fencedCode === 'excluded' ? ' outside fenced code' : '');
  return demands === '' ? '' : ` (required${demands})`;
}

const MAX_LISTED_EXTRA_HEADINGS = 5;

/**
 * Judges the markdown HEADING STRUCTURE of the result (the sixth
 * comparison experiment; the judge's P1.3): line presence proves each
 * declared heading EXISTS, not that the document carries them in the
 * declared order without extras. The sections must all start with the
 * SAME markdown heading marker (an identical count of leading '#'
 * characters, one to six, followed by whitespace); the governed level
 * derives from that marker. Fenced code is ALWAYS stripped first,
 * because a '## ' line inside a code sample is not a heading in
 * rendered markdown, so a fenced fake can neither satisfy a declared
 * heading nor trip exclusivity. Heading lines compare trimmed, whole
 * line. With `ordered` (default true) the declared headings must
 * appear in declaration order; with `exclusive` (default true) each
 * declared heading must appear once, unrepeated, and no undeclared heading
 * of the governed level may exist (other levels stay free). Default
 * name 'heading-structure'.
 */
export function headingStructureValidator(options: {
  sections: readonly string[];
  name?: string;
  ordered?: boolean;
  exclusive?: boolean;
}): FinishValidator {
  const sections = requireNonEmptyStrings(
    options.sections,
    'headingStructureValidator sections',
  ).map((section) => section.trim());
  let level: number | undefined;
  for (const section of sections) {
    const marker = /^(#{1,6})\s+\S/.exec(section);
    if (marker?.[1] === undefined) {
      throw new ConfigError(
        `headingStructureValidator section '${section}' is not a markdown heading ` +
          "(one to six '#' characters, whitespace, then content)",
      );
    }
    if (level === undefined) {
      level = marker[1].length;
    } else if (marker[1].length !== level) {
      throw new ConfigError(
        'headingStructureValidator sections must all start with the ' +
          `same markdown heading marker; got level ${String(marker[1].length)} ` +
          `after level ${String(level)}`,
      );
    }
  }
  const declaredLevel = level ?? 2;
  const declared = new Set<string>();
  for (const section of sections) {
    if (declared.has(section)) {
      throw new ConfigError(`headingStructureValidator sections carry a duplicate: '${section}'`);
    }
    declared.add(section);
  }
  for (const [flag, value] of [
    ['ordered', options.ordered],
    ['exclusive', options.exclusive],
  ] as const) {
    if (value !== undefined && typeof value !== 'boolean') {
      throw new ConfigError(
        `headingStructureValidator ${flag} must be a boolean; got ${String(value)}`,
      );
    }
  }
  const ordered = options.ordered ?? true;
  const exclusive = options.exclusive ?? true;
  const headingRe = new RegExp(`^#{${String(declaredLevel)}}(?!#)\\s`);
  return {
    name: options.name ?? 'heading-structure',
    validate: (input) => {
      const headings = stripFencedBlocks(input.text)
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => headingRe.test(line));
      const reasons: string[] = [];
      const present = new Set(headings);
      for (const section of sections) {
        if (!present.has(section)) {
          reasons.push(`required heading '${section}' is missing`);
        }
      }
      if (exclusive) {
        const seenDeclared = new Set<string>();
        for (const heading of headings) {
          if (declared.has(heading)) {
            if (seenDeclared.has(heading)) {
              reasons.push(`duplicate heading '${heading}'`);
            }
            seenDeclared.add(heading);
          }
        }
      }
      if (ordered) {
        // First occurrences of declared headings in text order, held
        // against the declaration order of those actually present.
        const firstSeen: string[] = [];
        const taken = new Set<string>();
        for (const heading of headings) {
          if (declared.has(heading) && !taken.has(heading)) {
            taken.add(heading);
            firstSeen.push(heading);
          }
        }
        const expected = sections.filter((section) => taken.has(section));
        for (let i = 0; i < expected.length; i++) {
          if (firstSeen[i] !== expected[i]) {
            reasons.push(
              `heading order mismatch at position ${String(i + 1)}: ` +
                `found '${firstSeen[i] ?? ''}' where '${expected[i] ?? ''}' is declared`,
            );
            break;
          }
        }
      }
      if (exclusive) {
        const extras: string[] = [];
        const listed = new Set<string>();
        for (const heading of headings) {
          if (!declared.has(heading) && !listed.has(heading)) {
            listed.add(heading);
            extras.push(heading);
          }
        }
        for (const extra of extras.slice(0, MAX_LISTED_EXTRA_HEADINGS)) {
          reasons.push(`undeclared level ${String(declaredLevel)} heading '${extra}'`);
        }
        if (extras.length > MAX_LISTED_EXTRA_HEADINGS) {
          reasons.push(
            `and ${String(extras.length - MAX_LISTED_EXTRA_HEADINGS)} more undeclared ` +
              `level ${String(declaredLevel)} headings`,
          );
        }
      }
      return reasons.length === 0 ? ok : { ok: false, reasons };
    },
  };
}

/**
 * Requires every named section to appear LITERALLY in the result text
 * (a heading like 'FINDINGS' or any marker the goal demands). Default
 * name 'required-sections'; pass `name` to run several instances.
 * `match: 'line'` demands each marker as its own line and
 * `fencedCode: 'excluded'` ignores markers inside fenced code blocks
 * (cycle 74); both default to the historical byte identical behavior.
 */
export function requiredSectionsValidator(options: {
  sections: readonly string[];
  name?: string;
  match?: SectionMatchMode;
  fencedCode?: FencedCodeMode;
}): FinishValidator {
  const sections = requireNonEmptyStrings(options.sections, 'requiredSectionsValidator sections');
  const match =
    options.match === undefined
      ? 'anywhere'
      : requireSectionMatchMode(options.match, 'requiredSectionsValidator match');
  const fencedCode =
    options.fencedCode === undefined
      ? 'counted'
      : requireFencedCodeMode(options.fencedCode, 'requiredSectionsValidator fencedCode');
  const qualifier = missingSectionQualifier(match, fencedCode);
  return {
    name: options.name ?? 'required-sections',
    validate: (input) => {
      const scope = fencedCode === 'excluded' ? stripFencedBlocks(input.text) : input.text;
      const missing = sections.filter((section) => sectionPosition(scope, section, match) < 0);
      return missing.length === 0
        ? ok
        : {
            ok: false,
            reasons: missing.map(
              (section) => `required section '${section}' is missing${qualifier}`,
            ),
          };
    },
  };
}

/**
 * Requires the result to be a JSON object carrying every named field
 * with a substantial value: present, not null, and not an empty or
 * whitespace only string (empty arrays, zero, and false COUNT as
 * present; emptiness rules beyond strings belong to a custom
 * validator). Default name 'required-fields'.
 */
export function requiredFieldsValidator(options: {
  fields: readonly string[];
  name?: string;
}): FinishValidator {
  const fields = requireNonEmptyStrings(options.fields, 'requiredFieldsValidator fields');
  return {
    name: options.name ?? 'required-fields',
    validate: (input) => {
      const result = input.result;
      if (typeof result !== 'object' || result === null || Array.isArray(result)) {
        return { ok: false, reasons: ['the finish result is not a JSON object'] };
      }
      const record = result as Record<string, Json>;
      const reasons: string[] = [];
      for (const field of fields) {
        const value = record[field];
        if (value === undefined || value === null) {
          reasons.push(`required field '${field}' is missing`);
        } else if (typeof value === 'string' && value.trim().length === 0) {
          reasons.push(`required field '${field}' is empty`);
        }
      }
      return reasons.length === 0 ? ok : { ok: false, reasons };
    },
  };
}

/**
 * Requires the result text's word count (whitespace separated tokens;
 * an empty text counts zero) to sit inside the configured bounds (the
 * v1.71 experiment review, P0.7: a formal length requirement must be
 * code, never a natural-language plea the model may round away). At
 * least one bound is required; both are positive integers with
 * min <= max. Default name 'word-count'. `fencedCode: 'excluded'`
 * counts only words outside fenced code blocks (cycle 74), so code
 * samples cannot pad a length requirement; the default counts
 * everything, byte identical to the historical behavior.
 */
export function wordCountValidator(options: {
  min?: number;
  max?: number;
  name?: string;
  fencedCode?: FencedCodeMode;
}): FinishValidator {
  const { min, max } = options;
  if (min === undefined && max === undefined) {
    throw new ConfigError('wordCountValidator requires min, max, or both');
  }
  for (const [label, value] of [
    ['min', min],
    ['max', max],
  ] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
      throw new ConfigError(
        `wordCountValidator ${label} must be a positive integer; got ${String(value)}`,
      );
    }
  }
  if (min !== undefined && max !== undefined && min > max) {
    throw new ConfigError(`wordCountValidator min ${String(min)} exceeds max ${String(max)}`);
  }
  const fencedCode =
    options.fencedCode === undefined
      ? 'counted'
      : requireFencedCodeMode(options.fencedCode, 'wordCountValidator fencedCode');
  const counted = fencedCode === 'excluded' ? ' (fenced code excluded)' : '';
  return {
    name: options.name ?? 'word-count',
    validate: (input) => {
      const scope = fencedCode === 'excluded' ? stripFencedBlocks(input.text) : input.text;
      const trimmed = scope.trim();
      const count = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
      const reasons: string[] = [];
      if (min !== undefined && count < min) {
        reasons.push(
          `result word count ${String(count)}${counted} is below the required minimum ${String(min)}`,
        );
      }
      if (max !== undefined && count > max) {
        reasons.push(
          `result word count ${String(count)}${counted} exceeds the maximum ${String(max)}`,
        );
      }
      return reasons.length === 0 ? ok : { ok: false, reasons };
    },
  };
}

/** The default citation shape: a path with an extension, a colon, a line number. */
export const DEFAULT_CITATION_PATTERN = '[\\w./-]+\\.\\w+:\\d+';
/** The default preserved share, the improvement plan's RV-202 gate. */
export const DEFAULT_EVIDENCE_MIN_SHARE = 0.95;
const MAX_LISTED_CITATIONS = 20;

function listCitations(values: string[]): string {
  return values.length <= MAX_LISTED_CITATIONS
    ? values.join(', ')
    : `${values.slice(0, MAX_LISTED_CITATIONS).join(', ')} and ` +
        `${String(values.length - MAX_LISTED_CITATIONS)} more`;
}

/**
 * The RV-202 evidence preservation contract: the finish result must
 * PRESERVE the citations the children actually produced. Distinct
 * matches of `pattern` are collected across the outputs of children
 * settled 'ok' (spawn order); at least `minShare` of them (default
 * {@link DEFAULT_EVIDENCE_MIN_SHARE}, the plan's 95 percent gate,
 * compared as a ceiling on the required count so an exact boundary like
 * 19 of 20 passes) must appear literally in the result text. Zero child
 * citations pass vacuously UNLESS `requireNonEmptyPool: true` (RV507):
 * for an evidence-critical run the empty pool IS the failure, so that
 * mode refuses it with an `empty child citation pool` reason instead of
 * the vacuous pass. With `requireKnown: true` the contract also
 * runs in reverse: every citation in the RESULT must appear in some
 * child's output, so a fabricated but pattern valid citation is
 * rejected instead of silently counting as evidence. Rejection reasons
 * list the missing (and unknown) citations, capped at 20, so the repair
 * turn can restore them. Purely textual and deterministic; checking
 * that cited targets EXIST on disk is host territory (a custom
 * validator), not this contract. Intake is fail closed (RV610): a
 * pattern that can match the empty string is refused typed (an empty
 * match would enter the pool as fabricated evidence and defeat
 * `requireNonEmptyPool`), zero-length matches never enter the pool
 * even when a lookaround produces them in context, and the strict-mode
 * booleans must be real booleans, so a stray `'true'` can never
 * silently disable the mode it names. Default name
 * 'evidence-preserved'.
 */
export function evidencePreservedValidator(options?: {
  pattern?: string;
  flags?: string;
  minShare?: number;
  requireKnown?: boolean;
  requireNonEmptyPool?: boolean;
  name?: string;
}): FinishValidator {
  const pattern = options?.pattern ?? DEFAULT_CITATION_PATTERN;
  const flags = options?.flags ?? '';
  const globalFlags = flags.includes('g') ? flags : `${flags}g`;
  let probe: RegExp;
  try {
    probe = new RegExp(pattern, flags.replace('g', ''));
  } catch (thrown) {
    throw new ConfigError(
      `evidencePreservedValidator pattern does not compile: ${
        thrown instanceof Error ? thrown.message : String(thrown)
      }`,
    );
  }
  // Fail-closed intake (RV610): a pattern that can match the empty
  // string manufactures a non-empty "evidence" pool out of nothing ('',
  // which every result trivially "preserves" and which defeats
  // requireNonEmptyPool), so it is refused here, symmetric to the
  // minShare domain check below. Patterns that produce zero-length
  // matches only in context (a bare lookaround) slip past this probe
  // and are caught by the pool filter instead.
  if (probe.test('')) {
    throw new ConfigError(
      `evidencePreservedValidator pattern must not be able to match the empty string ` +
        `(an empty match would enter the citation pool as fabricated evidence); got ` +
        `${JSON.stringify(pattern)}`,
    );
  }
  const minShare = options?.minShare ?? DEFAULT_EVIDENCE_MIN_SHARE;
  if (typeof minShare !== 'number' || !Number.isFinite(minShare) || minShare <= 0 || minShare > 1) {
    throw new ConfigError(
      `evidencePreservedValidator minShare must be a number in (0, 1]; got ${String(minShare)}`,
    );
  }
  // The strict-mode booleans authorize refusals; truthiness ('true', 1)
  // must never silently DISABLE them, so anything but a real boolean is
  // refused at intake (RV610).
  for (const option of ['requireKnown', 'requireNonEmptyPool'] as const) {
    const value = options?.[option];
    if (value !== undefined && typeof value !== 'boolean') {
      throw new ConfigError(
        `evidencePreservedValidator ${option} must be a boolean when given; got ` +
          `${JSON.stringify(value)}`,
      );
    }
  }
  return {
    name: options?.name ?? 'evidence-preserved',
    validate: (input) => {
      // Fresh RegExp per scan: the 'g' flag makes matching stateful.
      const cited = new Set<string>();
      for (const child of input.children ?? []) {
        // A salvage-accepted limit output is evidence too (the 1.64.0
        // experiment review, P0.4): the runtime marks salvageableOutput
        // only under acceptance.acceptValidatedTerminalOutputOnLimit,
        // so every other configuration keeps the exact old pool, and
        // with requireKnown the orchestrator quoting a salvaged child
        // is no longer flagged as fabricating citations.
        if (child.status !== 'ok' && child.salvageableOutput !== true) {
          continue;
        }
        for (const match of child.text.match(new RegExp(pattern, globalFlags)) ?? []) {
          // Zero-length matches never enter the pool (RV610): a bare
          // lookaround can produce them past the intake probe, and an
          // empty "citation" is fabricated evidence by construction.
          if (match.length > 0) {
            cited.add(match);
          }
        }
      }
      const reasons: string[] = [];
      if (cited.size === 0 && options?.requireNonEmptyPool === true) {
        // The vacuous pass inverted (RV507): when the run exists to
        // produce evidence, zero collected citations is the defect the
        // contract must name, not a reason to stand down.
        reasons.push(
          'empty child citation pool: no ok child output contains a citation matching the pattern',
        );
      }
      if (cited.size > 0) {
        const missing = [...cited].filter((citation) => !input.text.includes(citation));
        const preserved = cited.size - missing.length;
        const required = Math.ceil(minShare * cited.size - 1e-9);
        if (preserved < required) {
          reasons.push(
            `evidence preservation ${String(preserved)} of ${String(cited.size)} child ` +
              `citations is below the required share ${String(minShare)}; ` +
              `missing: ${listCitations(missing)}`,
          );
        }
      }
      if (options?.requireKnown === true) {
        const fabricated = [
          ...new Set(input.text.match(new RegExp(pattern, globalFlags)) ?? []),
        ].filter((citation) => citation.length > 0 && !cited.has(citation));
        if (fabricated.length > 0) {
          reasons.push(
            `unknown citations not present in any child report: ${listCitations(fabricated)}`,
          );
        }
      }
      return reasons.length === 0 ? ok : { ok: false, reasons };
    },
  };
}

/**
 * Requires at least `min` matches of `pattern` INSIDE every named
 * section (the v1.71 experiment review, P1.2: a total citation count
 * hides sections carrying zero provenance). A section's slice runs
 * from its FIRST occurrence to the next found section marker in text
 * position order, or to the end of the text; a marker absent from the
 * text is its own failure reason, because coverage of a missing
 * section cannot silently count as satisfied.
 * requiredSectionsValidator still owns plain presence. Default name
 * 'section-citations'. `match: 'line'` anchors each section at the
 * first line equal to its marker and `fencedCode: 'excluded'` removes
 * fenced code before anchoring, slicing, and counting (cycle 74), so a
 * marker echoed inside a code sample can neither anchor a slice nor
 * donate citations; both default to the historical behavior.
 */
export function sectionCitationsValidator(options: {
  sections: readonly string[];
  pattern?: string;
  flags?: string;
  min: number;
  name?: string;
  match?: SectionMatchMode;
  fencedCode?: FencedCodeMode;
}): FinishValidator {
  const sections = requireNonEmptyStrings(options.sections, 'sectionCitationsValidator sections');
  const pattern = options.pattern ?? DEFAULT_CITATION_PATTERN;
  const flags = options.flags ?? '';
  const globalFlags = flags.includes('g') ? flags : `${flags}g`;
  try {
    new RegExp(pattern, globalFlags);
  } catch (thrown) {
    throw new ConfigError(
      `sectionCitationsValidator pattern does not compile: ${
        thrown instanceof Error ? thrown.message : String(thrown)
      }`,
    );
  }
  if (!Number.isInteger(options.min) || options.min < 1) {
    throw new ConfigError(
      `sectionCitationsValidator min must be a positive integer; got ${String(options.min)}`,
    );
  }
  const match =
    options.match === undefined
      ? 'anywhere'
      : requireSectionMatchMode(options.match, 'sectionCitationsValidator match');
  const fencedCode =
    options.fencedCode === undefined
      ? 'counted'
      : requireFencedCodeMode(options.fencedCode, 'sectionCitationsValidator fencedCode');
  const qualifier = missingSectionQualifier(match, fencedCode);
  const counted = fencedCode === 'excluded' ? ' (fenced code excluded)' : '';
  return {
    name: options.name ?? 'section-citations',
    validate: (input) => {
      const scope = fencedCode === 'excluded' ? stripFencedBlocks(input.text) : input.text;
      const positions = new Map<string, number>();
      for (const section of sections) {
        const at = sectionPosition(scope, section, match);
        if (at >= 0) {
          positions.set(section, at);
        }
      }
      const ordered = [...positions.entries()].sort((a, b) => a[1] - b[1]);
      const reasons: string[] = [];
      for (const section of sections) {
        const at = positions.get(section);
        if (at === undefined) {
          reasons.push(
            `required section '${section}' is missing${qualifier}, ` +
              'so its citation coverage cannot be judged',
          );
          continue;
        }
        const next = ordered.find(([, position]) => position > at);
        const slice = scope.slice(at, next === undefined ? scope.length : next[1]);
        // Fresh RegExp per slice: the 'g' flag makes matching stateful.
        const matches = slice.match(new RegExp(pattern, globalFlags))?.length ?? 0;
        if (matches < options.min) {
          reasons.push(
            `section '${section}' carries ${String(matches)} citations matching ` +
              `/${pattern}/${counted}; at least ${String(options.min)} required`,
          );
        }
      }
      return reasons.length === 0 ? ok : { ok: false, reasons };
    },
  };
}

/**
 * Requires at least `min` matches of `pattern` in the result text (the
 * plan's citation and source count checks: a file:line pattern, a URL
 * pattern). The pattern compiles at construction (invalid patterns are a
 * ConfigError before any run exists) and matches globally; `min` is a
 * positive integer. Default name 'min-matches'; pass `name` to run
 * several instances, because names must be unique per orchestrate call.
 * `fencedCode: 'excluded'` matches only outside fenced code blocks
 * (cycle 74), so citations quoted inside code samples do not count;
 * the default matches everything, byte identical to the historical
 * behavior.
 */
export function minMatchesValidator(options: {
  pattern: string;
  flags?: string;
  min: number;
  name?: string;
  fencedCode?: FencedCodeMode;
}): FinishValidator {
  const flags = options.flags ?? '';
  const globalFlags = flags.includes('g') ? flags : `${flags}g`;
  try {
    new RegExp(options.pattern, globalFlags);
  } catch (thrown) {
    throw new ConfigError(
      `minMatchesValidator pattern does not compile: ${
        thrown instanceof Error ? thrown.message : String(thrown)
      }`,
    );
  }
  if (!Number.isInteger(options.min) || options.min < 1) {
    throw new ConfigError(
      `minMatchesValidator min must be a positive integer; got ${String(options.min)}`,
    );
  }
  const fencedCode =
    options.fencedCode === undefined
      ? 'counted'
      : requireFencedCodeMode(options.fencedCode, 'minMatchesValidator fencedCode');
  const counted = fencedCode === 'excluded' ? ' (fenced code excluded)' : '';
  return {
    name: options.name ?? 'min-matches',
    validate: (input) => {
      const scope = fencedCode === 'excluded' ? stripFencedBlocks(input.text) : input.text;
      // A fresh RegExp per verdict: the 'g' flag makes matching stateful.
      const found = scope.match(new RegExp(options.pattern, globalFlags))?.length ?? 0;
      return found >= options.min
        ? ok
        : {
            ok: false,
            reasons: [
              `expected at least ${String(options.min)} matches of /${options.pattern}/` +
                `${flags}; found ${String(found)}${counted}`,
            ],
          };
    },
  };
}

/**
 * The default evidence-grade phrases (RV1212, the sixteenth comparison
 * experiment P2-3). Each asserts the STRONGEST kind of provenance a
 * report can claim: that something was watched running, that a
 * provider charged for it, or that it holds up in production. The
 * sixteenth run's own answer used exactly this register about a
 * runtime the live run never observed, which is the failure mode the
 * lint exists to catch.
 */
export const DEFAULT_EVIDENCE_GRADE_PHRASES: readonly string[] = [
  'live-observed',
  'live observed',
  'provider bill',
  'production-proven',
  'production proven',
];

/**
 * The default artifact reference: a run id (ULID-shaped, the ids the
 * engine mints) or a `path:line` citation.
 */
export const DEFAULT_ARTIFACT_PATTERN =
  '(?:run[ -]?[0-9A-HJKMNP-TV-Z]{6,26}|[\\w./-]+\\.\\w+:\\d+)';

/**
 * The sentence scope both RV1212 validators judge in: a terminator
 * followed by whitespace, a blank line, or a list/heading break. Only
 * `.!?` terminate; a colon or a semicolon does NOT, because the values
 * these validators read are written as `attempts: 3` and splitting
 * there would tear a claim away from the citation that supports it.
 */
function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n{2,}|\n(?=\s*[-*#])/u);
}

/**
 * Requires every evidence-GRADE claim to point at an artifact (RV1212).
 * A sentence that says `live-observed`, `provider bill`, or
 * `production-proven` is claiming the report watched it happen, and a
 * claim of that grade with nothing to check it against is the most
 * expensive kind of wrong: the sixteenth comparison run's answer used
 * the register about a runtime its own live run never observed, and
 * every reader-side check passed because the text was well formed.
 * The rule is deliberately local and deterministic: the artifact
 * reference must appear in the SAME sentence as the phrase (a run id
 * or a `path:line` citation by default), so moving the evidence three
 * paragraphs away no longer satisfies the grade. Purely textual: what
 * the referenced artifact contains is
 * {@link citedValueValidator}'s question, and whether it exists on
 * disk is the host's. Default name 'evidence-grade'.
 */
export function evidenceGradeValidator(options?: {
  /** Overrides {@link DEFAULT_EVIDENCE_GRADE_PHRASES}; matched case-insensitively. */
  phrases?: readonly string[];
  /** Overrides {@link DEFAULT_ARTIFACT_PATTERN}. */
  artifactPattern?: string;
  name?: string;
}): FinishValidator {
  const phrases =
    options?.phrases === undefined
      ? [...DEFAULT_EVIDENCE_GRADE_PHRASES]
      : requireNonEmptyStrings(options.phrases, 'evidenceGradeValidator phrases');
  const artifactPattern = options?.artifactPattern ?? DEFAULT_ARTIFACT_PATTERN;
  let artifact: RegExp;
  try {
    artifact = new RegExp(artifactPattern, '');
  } catch (thrown) {
    throw new ConfigError(
      `evidenceGradeValidator artifactPattern does not compile: ${
        thrown instanceof Error ? thrown.message : String(thrown)
      }`,
    );
  }
  // Fail-closed intake (RV610), the evidencePreservedValidator rule: a
  // pattern that matches the empty string satisfies every sentence and
  // silently disables the lint it was configured to arm.
  if (artifact.test('')) {
    throw new ConfigError(
      `evidenceGradeValidator artifactPattern must not be able to match the empty string ` +
        `(it would satisfy every graded claim); got ${JSON.stringify(artifactPattern)}`,
    );
  }
  const lowered = phrases.map((phrase) => phrase.toLowerCase());
  return {
    name: options?.name ?? 'evidence-grade',
    validate: (input) => {
      const unsupported: string[] = [];
      for (const sentence of sentencesOf(input.text)) {
        const haystack = sentence.toLowerCase();
        const found = lowered.filter((phrase) => haystack.includes(phrase));
        if (found.length === 0 || new RegExp(artifactPattern, '').test(sentence)) {
          continue;
        }
        for (const phrase of found) {
          if (!unsupported.includes(phrase)) {
            unsupported.push(phrase);
          }
        }
      }
      return unsupported.length === 0
        ? ok
        : {
            ok: false,
            reasons: [
              `evidence-grade claims cite no run or repro artifact in their own sentence: ` +
                `${listCitations(unsupported)}; each such claim must name a run id or a ` +
                `file:line citation beside it`,
            ],
          };
    },
  };
}

/** One resolved citation target: the source line the citation points at. */
export interface CitationTarget {
  path: string;
  line: number;
}

/**
 * Requires a cited location to actually carry the value the sentence
 * asserts (RV1212, the sixteenth comparison experiment P2-2). Citation
 * counting proves provenance was OFFERED, never that it holds: the
 * judge's own repro cited `retry.ts:24`, an interface declaration, for
 * a default that lives nine lines further down, and every
 * pattern-based check passed. This validator closes the loop with the
 * host's own source snapshot.
 *
 * The rule is deliberate and narrow, so a failure is always
 * explainable: within one sentence, the inline-code spans that are NOT
 * citations are the values that sentence asserts about the citations
 * that are, and each asserted value must appear in the cited line (or
 * within `window` lines AFTER it, for a value the citation introduces).
 * A sentence that cites without asserting an inline value passes: the
 * validator judges assertions, never prose.
 *
 * `resolve` is host code and must be PURE over a snapshot the host
 * froze before the run, exactly like every other finish validator: a
 * resolver that reads the filesystem live would make a verdict depend
 * on when it ran and break replay. Returning `undefined` means the
 * location does not exist in the snapshot, which is itself a failure:
 * a citation nothing resolves is not provenance. Default name
 * 'cited-value'.
 */
export function citedValueValidator(options: {
  resolve: (target: CitationTarget) => string | undefined;
  /** Lines AFTER the cited one that may carry the value; default 0. */
  window?: number;
  /** Overrides {@link DEFAULT_CITATION_PATTERN}; must capture `path:line`. */
  pattern?: string;
  name?: string;
}): FinishValidator {
  if (typeof options.resolve !== 'function') {
    throw new ConfigError('citedValueValidator resolve must be a function');
  }
  const window = options.window ?? 0;
  if (!Number.isInteger(window) || window < 0) {
    throw new ConfigError(
      `citedValueValidator window must be a non negative integer; got ${String(window)}`,
    );
  }
  const pattern = options.pattern ?? DEFAULT_CITATION_PATTERN;
  try {
    new RegExp(pattern, 'g');
  } catch (thrown) {
    throw new ConfigError(
      `citedValueValidator pattern does not compile: ${
        thrown instanceof Error ? thrown.message : String(thrown)
      }`,
    );
  }
  const CITATION_TAIL = /^(.*):(\d+)$/u;
  return {
    name: options.name ?? 'cited-value',
    validate: (input) => {
      const reasons: string[] = [];
      for (const sentence of sentencesOf(input.text)) {
        // Inline-code spans first: the ones that parse as `path:line`
        // are the citations, the rest are the values asserted about
        // them. Both come from the same span vocabulary, so a value
        // written as prose never enters the judgment.
        const spans = [...sentence.matchAll(/`([^`]+)`/gu)].map((match) => match[1]);
        const citations: CitationTarget[] = [];
        const values: string[] = [];
        for (const span of spans) {
          const parsed = CITATION_TAIL.exec(span);
          const line = parsed === null ? Number.NaN : Number(parsed[2]);
          if (
            parsed !== null &&
            Number.isSafeInteger(line) &&
            new RegExp(`^${pattern}$`, '').test(span)
          ) {
            citations.push({ path: parsed[1], line });
          } else {
            values.push(span);
          }
        }
        if (citations.length === 0 || values.length === 0) {
          continue;
        }
        for (const citation of citations) {
          const lines: string[] = [];
          let resolved = false;
          for (let offset = 0; offset <= window; offset += 1) {
            const source = options.resolve({ path: citation.path, line: citation.line + offset });
            if (source === undefined) {
              // A gap inside the window ends the walk: past the end of
              // a file every further line is absent too, and a
              // resolver that returns undefined mid-file has already
              // said this location is not in the snapshot.
              break;
            }
            resolved = true;
            lines.push(source);
          }
          const where = `${citation.path}:${String(citation.line)}`;
          if (!resolved) {
            reasons.push(`citation ${where} resolves to no source line`);
            continue;
          }
          const haystack = lines.join('\n');
          const missing = values.filter((value) => !haystack.includes(value));
          if (missing.length > 0) {
            reasons.push(
              `citation ${where} does not carry the value its sentence asserts` +
                `${window === 0 ? '' : ` (searched ${String(window + 1)} lines)`}: ` +
                `${listCitations(missing)}`,
            );
          }
        }
      }
      return reasons.length === 0
        ? ok
        : { ok: false, reasons: reasons.slice(0, MAX_LISTED_CITATIONS) };
    },
  };
}
