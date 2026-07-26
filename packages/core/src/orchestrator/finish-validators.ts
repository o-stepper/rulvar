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
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

/**
 * Removes fenced code blocks from a text, the delimiter lines
 * included, and returns the remaining lines joined by newlines. The
 * grammar is the CommonMark shape as a deliberate line heuristic: a
 * fence opens at a line starting (after at most three spaces) with
 * three or more backticks or tildes, an optional info string allowed;
 * it closes at the next line carrying only at least as many of the
 * SAME character; an unclosed fence runs to the end of the text.
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

function missingSectionQualifier(match: SectionMatchMode, fencedCode: FencedCodeMode): string {
  const demands =
    (match === 'line' ? ' as its own line' : '') +
    (fencedCode === 'excluded' ? ' outside fenced code' : '');
  return demands === '' ? '' : ` (required${demands})`;
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
 * citations pass vacuously. With `requireKnown: true` the contract also
 * runs in reverse: every citation in the RESULT must appear in some
 * child's output, so a fabricated but pattern valid citation is
 * rejected instead of silently counting as evidence. Rejection reasons
 * list the missing (and unknown) citations, capped at 20, so the repair
 * turn can restore them. Purely textual and deterministic; checking
 * that cited targets EXIST on disk is host territory (a custom
 * validator), not this contract. Default name 'evidence-preserved'.
 */
export function evidencePreservedValidator(options?: {
  pattern?: string;
  flags?: string;
  minShare?: number;
  requireKnown?: boolean;
  name?: string;
}): FinishValidator {
  const pattern = options?.pattern ?? DEFAULT_CITATION_PATTERN;
  const flags = options?.flags ?? '';
  const globalFlags = flags.includes('g') ? flags : `${flags}g`;
  try {
    new RegExp(pattern, globalFlags);
  } catch (thrown) {
    throw new ConfigError(
      `evidencePreservedValidator pattern does not compile: ${
        thrown instanceof Error ? thrown.message : String(thrown)
      }`,
    );
  }
  const minShare = options?.minShare ?? DEFAULT_EVIDENCE_MIN_SHARE;
  if (typeof minShare !== 'number' || !Number.isFinite(minShare) || minShare <= 0 || minShare > 1) {
    throw new ConfigError(
      `evidencePreservedValidator minShare must be a number in (0, 1]; got ${String(minShare)}`,
    );
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
          cited.add(match);
        }
      }
      const reasons: string[] = [];
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
        ].filter((citation) => !cited.has(citation));
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
