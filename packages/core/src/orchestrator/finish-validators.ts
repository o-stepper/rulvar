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
  return values as string[];
}

/**
 * Requires every named section to appear LITERALLY in the result text
 * (a heading like 'FINDINGS' or any marker the goal demands). Default
 * name 'required-sections'; pass `name` to run several instances.
 */
export function requiredSectionsValidator(options: {
  sections: string[];
  name?: string;
}): FinishValidator {
  const sections = requireNonEmptyStrings(options.sections, 'requiredSectionsValidator sections');
  return {
    name: options.name ?? 'required-sections',
    validate: (input) => {
      const missing = sections.filter((section) => !input.text.includes(section));
      return missing.length === 0
        ? ok
        : {
            ok: false,
            reasons: missing.map((section) => `required section '${section}' is missing`),
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
  fields: string[];
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
 * Requires at least `min` matches of `pattern` in the result text (the
 * plan's citation and source count checks: a file:line pattern, a URL
 * pattern). The pattern compiles at construction (invalid patterns are a
 * ConfigError before any run exists) and matches globally; `min` is a
 * positive integer. Default name 'min-matches'; pass `name` to run
 * several instances, because names must be unique per orchestrate call.
 */
export function minMatchesValidator(options: {
  pattern: string;
  flags?: string;
  min: number;
  name?: string;
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
  return {
    name: options.name ?? 'min-matches',
    validate: (input) => {
      // A fresh RegExp per verdict: the 'g' flag makes matching stateful.
      const found = input.text.match(new RegExp(options.pattern, globalFlags))?.length ?? 0;
      return found >= options.min
        ? ok
        : {
            ok: false,
            reasons: [
              `expected at least ${String(options.min)} matches of /${options.pattern}/` +
                `${flags}; found ${String(found)}`,
            ],
          };
    },
  };
}
