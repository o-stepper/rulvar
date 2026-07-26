/**
 * The unified output contract (the v1.71 experiment review: P0.1 the
 * manifest, P0.2 the frozen bundle, P0.3 the golden self test). ONE
 * immutable manifest generates the prompt statement the model reads,
 * the stock validator set the host enforces, a stable content hash,
 * and golden self-test fixtures, so the prompt and the validators
 * cannot drift apart by construction. The experiment's terminal
 * failure was exactly that drift: the question renamed three sections,
 * the harness validator kept the old names, and the mismatch survived
 * until paid provider turns had burned. With a contract, the same
 * mistake is a ConfigError before the first provider call.
 */
import { createHash } from 'node:crypto';

import { ConfigError } from '../l0/errors.js';
import { jcsSerialize } from '../l0/jcs.js';
import {
  DEFAULT_CITATION_PATTERN,
  minMatchesValidator,
  requiredSectionsValidator,
  sectionCitationsValidator,
  wordCountValidator,
  type FencedCodeMode,
  type FinishValidationInput,
  type FinishValidator,
  type SectionMatchMode,
} from './finish-validators.js';

/** The golden citation sample used with {@link DEFAULT_CITATION_PATTERN}. */
export const DEFAULT_CITATION_SAMPLE = 'docs/output-contract.md:1';
/** The filler token golden skeletons pad word counts with. */
const FILLER_WORD = 'placeholder';

/** The citation demands of a {@link FinishContractManifest}. */
export interface FinishContractCitations {
  /** Regex source over the result text; default {@link DEFAULT_CITATION_PATTERN}. */
  pattern?: string;
  flags?: string;
  /** Total matches required across the whole result text. */
  min?: number;
  /** Matches required inside EVERY declared section; requires `sections`. */
  perSection?: number;
  /**
   * A literal string matching `pattern`, embedded in the golden
   * fixtures (a regex cannot be sampled mechanically). REQUIRED with a
   * custom pattern; defaults to {@link DEFAULT_CITATION_SAMPLE} for
   * the default pattern. Must contain no whitespace and no declared
   * section marker.
   */
  sample?: string;
}

/**
 * The single source of truth of a textual finish contract: what the
 * prompt promises IS what the validators enforce. Declare only textual
 * demands here (sections, length, citations); an object-shaped result
 * belongs to {@link requiredSectionsValidator}'s sibling
 * requiredFieldsValidator and a host-provided selfTest accept fixture.
 */
export interface FinishContractManifest {
  /** Literal section markers the result must contain. */
  sections?: string[];
  /**
   * How section markers must appear (cycle 74): 'anywhere' (the
   * default, a plain substring test) or 'line' (each marker must
   * stand as its own line, surrounding whitespace ignored, so a mid
   * sentence mention no longer satisfies a heading). Requires
   * `sections`. Joins the hash and the prompt statement only when
   * 'line'; an explicit 'anywhere' normalizes away, keeping the hash
   * of the plain manifest.
   */
  sectionsMatch?: SectionMatchMode;
  /** Word bounds over the result text (whitespace separated tokens). */
  words?: { min?: number; max?: number };
  /** Citation demands over the result text. */
  citations?: FinishContractCitations;
  /**
   * Whether fenced code blocks count (cycle 74): 'counted' (the
   * default) or 'excluded' (fenced code is removed before section
   * matching, slicing, word counting, and citation matching, so code
   * samples can neither satisfy a marker nor pad a count). Joins the
   * hash and adds a prompt statement only when 'excluded'; an explicit
   * 'counted' normalizes away. With 'excluded', a section marker or a
   * citation sample that would itself OPEN a fence is a ConfigError,
   * because the golden fixtures embed both at line starts.
   */
  fencedCode?: FencedCodeMode;
}

/**
 * One per validator reject golden (cycle 74): a fixture the NAMED
 * contract validator is proven to reject at construction time.
 * {@link selfTestFinishValidation} holds the CONFIGURED validator of
 * that name against it, so a same-name replacement weaker than the
 * contract's own validator (a words minimum of one standing in for
 * three thousand) is caught before any provider call instead of
 * silently accepting what the journaled contract hash forbids.
 */
export interface FinishContractGoldenReject {
  /** The contract validator this fixture targets, by name. */
  readonly validator: string;
  /** The fixture that validator must reject. */
  readonly input: FinishValidationInput;
}

/**
 * What {@link finishContract} builds from a manifest. The whole bundle
 * is DEEPLY frozen (cycle 74): the nested manifest objects, the
 * sections array, the validators array, and each validator object, so
 * a post construction mutation throws instead of silently diverging
 * behavior from the journaled contract hash.
 */
export interface FinishContract {
  /** The normalized manifest (defaults applied), deeply frozen. */
  readonly manifest: FinishContractManifest;
  /** sha256 hex over the JCS serialization of the normalized manifest. */
  readonly hash: string;
  /**
   * The stock validators enforcing the manifest; names are
   * 'contract-*'. The array and each validator object are frozen at
   * runtime (the type stays mutable for source compatibility), so an
   * in-place pop or a validate() swap throws instead of silently
   * weakening what the hash promises.
   */
  readonly validators: FinishValidator[];
  /** The contract statement for the model, one demand per line. */
  readonly promptLines: readonly string[];
  /** A generated fixture every contract validator accepts. */
  readonly goldenAccept: FinishValidationInput;
  /**
   * A generated fixture at least one contract validator rejects.
   * Absent when the manifest carries only upper bounds, because an
   * empty result is then legitimately acceptable.
   */
  readonly goldenReject?: FinishValidationInput;
  /**
   * One reject golden PER contract validator (cycle 74), in validator
   * order, each verified at construction; boundary sharp where a
   * boundary is mechanically safe (the words fixture sits exactly one
   * word outside the bound), the empty text otherwise.
   */
  readonly goldenRejects: readonly FinishContractGoldenReject[];
}

function requirePositiveInt(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ConfigError(`${what} must be a positive integer; got ${String(value)}`);
  }
  return value;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

/**
 * Builds a {@link FinishContract} from one manifest: validation and the
 * golden fixtures happen HERE, at configuration time, so a
 * self-contradictory contract (mandatory content alone above words.max,
 * an unsampled custom pattern) fails before any run exists. Spread
 * `contract.validators` into finishValidation.validators and pass the
 * contract itself as finishValidation.contract; the orchestrator then
 * injects `promptLines` into the coordination and synthesis prompts,
 * runs the golden self test at construction, and journals the frozen
 * bundle descriptor.
 */
export function finishContract(manifest: FinishContractManifest): FinishContract {
  if (typeof manifest !== 'object' || manifest === null) {
    throw new ConfigError('finishContract manifest must be an object');
  }
  const { sections, sectionsMatch, words, citations, fencedCode } = manifest;
  if (sections === undefined && words === undefined && citations === undefined) {
    throw new ConfigError('finishContract manifest must declare sections, words, or citations');
  }

  let normalizedSections: string[] | undefined;
  if (sections !== undefined) {
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new ConfigError('finishContract sections must be a non empty array of strings');
    }
    const seen = new Set<string>();
    for (const section of sections) {
      if (typeof section !== 'string' || section.trim().length === 0) {
        throw new ConfigError('finishContract sections must contain only non empty strings');
      }
      if (section.includes('\n')) {
        throw new ConfigError(`finishContract section '${section}' must be a single line`);
      }
      if (seen.has(section)) {
        throw new ConfigError(`finishContract sections must be unique; '${section}' repeats`);
      }
      seen.add(section);
    }
    normalizedSections = [...sections];
  }

  let normalizedWords: { min?: number; max?: number } | undefined;
  if (words !== undefined) {
    if (typeof words !== 'object' || words === null) {
      throw new ConfigError('finishContract words must be an object');
    }
    if (words.min === undefined && words.max === undefined) {
      throw new ConfigError('finishContract words requires min, max, or both');
    }
    if (words.min !== undefined) {
      requirePositiveInt(words.min, 'finishContract words.min');
    }
    if (words.max !== undefined) {
      requirePositiveInt(words.max, 'finishContract words.max');
    }
    if (words.min !== undefined && words.max !== undefined && words.min > words.max) {
      throw new ConfigError(
        `finishContract words.min ${String(words.min)} exceeds words.max ${String(words.max)}`,
      );
    }
    normalizedWords = {
      ...(words.min === undefined ? {} : { min: words.min }),
      ...(words.max === undefined ? {} : { max: words.max }),
    };
  }

  let normalizedCitations:
    | { pattern: string; flags: string; sample: string; min?: number; perSection?: number }
    | undefined;
  if (citations !== undefined) {
    if (typeof citations !== 'object' || citations === null) {
      throw new ConfigError('finishContract citations must be an object');
    }
    if (citations.min === undefined && citations.perSection === undefined) {
      throw new ConfigError('finishContract citations requires min, perSection, or both');
    }
    if (citations.min !== undefined) {
      requirePositiveInt(citations.min, 'finishContract citations.min');
    }
    if (citations.perSection !== undefined) {
      requirePositiveInt(citations.perSection, 'finishContract citations.perSection');
      if (normalizedSections === undefined) {
        throw new ConfigError('finishContract citations.perSection requires sections');
      }
    }
    const pattern = citations.pattern ?? DEFAULT_CITATION_PATTERN;
    const flags = citations.flags ?? '';
    const globalFlags = flags.includes('g') ? flags : `${flags}g`;
    try {
      new RegExp(pattern, globalFlags);
    } catch (thrown) {
      throw new ConfigError(
        `finishContract citations.pattern does not compile: ${
          thrown instanceof Error ? thrown.message : String(thrown)
        }`,
      );
    }
    const sample =
      citations.sample ?? (citations.pattern === undefined ? DEFAULT_CITATION_SAMPLE : undefined);
    if (sample === undefined) {
      throw new ConfigError(
        'finishContract citations.sample is required with a custom pattern: the golden ' +
          'fixtures embed a literal match',
      );
    }
    if (typeof sample !== 'string' || sample.length === 0 || /\s/u.test(sample)) {
      throw new ConfigError(
        'finishContract citations.sample must be a non empty string without whitespace',
      );
    }
    // A fresh RegExp per test: the 'g' flag makes matching stateful.
    if (!new RegExp(pattern, globalFlags).test(sample)) {
      throw new ConfigError(
        `finishContract citations.sample '${sample}' does not match the citation pattern`,
      );
    }
    if (normalizedSections?.some((section) => sample.includes(section)) === true) {
      throw new ConfigError(
        'finishContract citations.sample must not contain a declared section marker',
      );
    }
    normalizedCitations = {
      pattern,
      flags,
      sample,
      ...(citations.min === undefined ? {} : { min: citations.min }),
      ...(citations.perSection === undefined ? {} : { perSection: citations.perSection }),
    };
  }

  // The exactness knobs (cycle 74): explicit defaults normalize away,
  // so a manifest declaring 'anywhere' or 'counted' hashes exactly
  // like one declaring nothing.
  let normalizedSectionsMatch: 'line' | undefined;
  if (sectionsMatch !== undefined) {
    if (sectionsMatch !== 'anywhere' && sectionsMatch !== 'line') {
      throw new ConfigError(
        `finishContract sectionsMatch must be 'anywhere' or 'line'; got ${String(sectionsMatch)}`,
      );
    }
    if (normalizedSections === undefined) {
      throw new ConfigError('finishContract sectionsMatch requires sections');
    }
    if (sectionsMatch === 'line') {
      normalizedSectionsMatch = 'line';
    }
  }
  let normalizedFencedCode: 'excluded' | undefined;
  if (fencedCode !== undefined) {
    if (fencedCode !== 'counted' && fencedCode !== 'excluded') {
      throw new ConfigError(
        `finishContract fencedCode must be 'counted' or 'excluded'; got ${String(fencedCode)}`,
      );
    }
    if (fencedCode === 'excluded') {
      normalizedFencedCode = 'excluded';
    }
  }
  if (normalizedFencedCode === 'excluded') {
    // The golden fixtures place markers and samples at line starts, so
    // content that would OPEN a fence would exclude the rest of the
    // fixture from its own validation: a contradiction, caught here.
    const opensFence = /^\s*(`{3,}|~{3,})/;
    for (const section of normalizedSections ?? []) {
      if (opensFence.test(section)) {
        throw new ConfigError(
          `finishContract section '${section}' would open a code fence under ` +
            "fencedCode 'excluded'",
        );
      }
    }
    if (normalizedCitations !== undefined && opensFence.test(normalizedCitations.sample)) {
      throw new ConfigError(
        `finishContract citations.sample '${normalizedCitations.sample}' would open a code ` +
          "fence under fencedCode 'excluded'",
      );
    }
  }

  const normalized: FinishContractManifest = {
    ...(normalizedSections === undefined ? {} : { sections: normalizedSections }),
    ...(normalizedSectionsMatch === undefined ? {} : { sectionsMatch: normalizedSectionsMatch }),
    ...(normalizedWords === undefined ? {} : { words: normalizedWords }),
    ...(normalizedCitations === undefined ? {} : { citations: normalizedCitations }),
    ...(normalizedFencedCode === undefined ? {} : { fencedCode: normalizedFencedCode }),
  };
  const hash = createHash('sha256').update(jcsSerialize(normalized), 'utf8').digest('hex');
  // The deep freeze (cycle 74): the hash just bound these bytes, so
  // every nested object the bundle exposes must be immutable from
  // here on. The sections array is also what the validators captured
  // by copy, so a frozen manifest can never diverge from enforcement.
  if (normalizedSections !== undefined) {
    Object.freeze(normalizedSections);
  }
  if (normalizedWords !== undefined) {
    Object.freeze(normalizedWords);
  }
  if (normalizedCitations !== undefined) {
    Object.freeze(normalizedCitations);
  }

  const matchOption =
    normalizedSectionsMatch === undefined ? {} : { match: normalizedSectionsMatch };
  const fencedOption =
    normalizedFencedCode === undefined ? {} : { fencedCode: normalizedFencedCode };
  const validators: FinishValidator[] = [];
  if (normalizedSections !== undefined) {
    validators.push(
      requiredSectionsValidator({
        sections: normalizedSections,
        name: 'contract-sections',
        ...matchOption,
        ...fencedOption,
      }),
    );
  }
  if (normalizedWords !== undefined) {
    validators.push(
      wordCountValidator({ ...normalizedWords, name: 'contract-words', ...fencedOption }),
    );
  }
  if (normalizedCitations?.min !== undefined) {
    validators.push(
      minMatchesValidator({
        pattern: normalizedCitations.pattern,
        flags: normalizedCitations.flags,
        min: normalizedCitations.min,
        name: 'contract-citations',
        ...fencedOption,
      }),
    );
  }
  if (normalizedCitations?.perSection !== undefined && normalizedSections !== undefined) {
    validators.push(
      sectionCitationsValidator({
        sections: normalizedSections,
        pattern: normalizedCitations.pattern,
        flags: normalizedCitations.flags,
        min: normalizedCitations.perSection,
        name: 'contract-section-citations',
        ...matchOption,
        ...fencedOption,
      }),
    );
  }

  const promptLines: string[] = [];
  if (normalizedSections !== undefined) {
    promptLines.push(
      (normalizedSectionsMatch === 'line'
        ? 'The final result must contain each of these section markers verbatim, each on ' +
          'its own line: '
        : 'The final result must contain each of these section markers verbatim: ') +
        normalizedSections.map((section) => `'${section}'`).join(', ') +
        '.',
    );
  }
  if (normalizedWords !== undefined) {
    const { min, max } = normalizedWords;
    if (min !== undefined && max !== undefined) {
      promptLines.push(
        `The final result must be between ${String(min)} and ${String(max)} words ` +
          '(whitespace separated).',
      );
    } else if (min !== undefined) {
      promptLines.push(
        `The final result must be at least ${String(min)} words (whitespace separated).`,
      );
    } else if (max !== undefined) {
      promptLines.push(
        `The final result must be at most ${String(max)} words (whitespace separated).`,
      );
    }
  }
  if (normalizedCitations !== undefined) {
    if (normalizedCitations.min !== undefined) {
      promptLines.push(
        `Include at least ${String(normalizedCitations.min)} citations matching ` +
          `/${normalizedCitations.pattern}/ overall (for example '${normalizedCitations.sample}').`,
      );
    }
    if (normalizedCitations.perSection !== undefined) {
      promptLines.push(
        `Every required section must itself contain at least ` +
          `${String(normalizedCitations.perSection)} such citations.`,
      );
    }
  }
  if (normalizedFencedCode === 'excluded') {
    promptLines.push(
      'Text inside fenced code blocks (``` or ~~~) does not count toward sections, word ' +
        'counts, or citations.',
    );
  }

  // The golden accept skeleton: sections in order, per-section
  // citations, the global citation minimum, padded up to words.min.
  // Mandatory content past words.max is a manifest contradiction and
  // fails HERE, before any run exists.
  const lines: string[] = [];
  const perSection = normalizedCitations?.perSection ?? 0;
  for (const section of normalizedSections ?? []) {
    lines.push(section);
    if (normalizedCitations !== undefined && perSection > 0) {
      const sample = normalizedCitations.sample;
      lines.push(Array.from({ length: perSection }, () => sample).join(' '));
    }
  }
  if (normalizedCitations !== undefined) {
    const placed = (normalizedSections?.length ?? 0) * perSection;
    const deficit = Math.max(0, (normalizedCitations.min ?? 0) - placed);
    if (deficit > 0) {
      const sample = normalizedCitations.sample;
      lines.push(Array.from({ length: deficit }, () => sample).join(' '));
    }
  }
  let goldenText = lines.join('\n');
  const mandatoryWords = countWords(goldenText);
  if (normalizedWords?.max !== undefined && mandatoryWords > normalizedWords.max) {
    throw new ConfigError(
      `finishContract is self contradictory: its mandatory content alone is ` +
        `${String(mandatoryWords)} words, above words.max ${String(normalizedWords.max)}`,
    );
  }
  if (normalizedWords?.min !== undefined && mandatoryWords < normalizedWords.min) {
    const padding = Array.from(
      { length: normalizedWords.min - mandatoryWords },
      () => FILLER_WORD,
    ).join(' ');
    goldenText = goldenText.length === 0 ? padding : `${goldenText}\n${padding}`;
  }
  const goldenAccept: FinishValidationInput = Object.freeze({
    result: goldenText,
    text: goldenText,
    children: Object.freeze([
      Object.freeze({ handle: 0, nodeId: 'contract-golden', status: 'ok', text: goldenText }),
    ]),
  });

  const hasLowerBound =
    normalizedSections !== undefined ||
    normalizedWords?.min !== undefined ||
    normalizedCitations !== undefined;
  const goldenReject: FinishValidationInput | undefined = hasLowerBound
    ? Object.freeze({
        result: '',
        text: '',
        children: Object.freeze([]),
      })
    : undefined;

  // The construction self check plus the per validator reject goldens
  // (cycle 74). Every validator must accept the generated skeleton
  // (free, synchronous, and it turns any manifest interaction the
  // golden builder missed into a ConfigError instead of a confusing
  // run-time self test failure), and every validator gets one fixture
  // it provably rejects, so a same-name replacement weaker than the
  // contract's own validator is detectable before any provider call.
  for (const validator of validators) {
    const verdict = validator.validate(goldenAccept);
    if (!verdict.ok) {
      throw new ConfigError(
        `finishContract self check failed: '${validator.name}' rejects the generated ` +
          `golden accept fixture: ${verdict.reasons.join('; ')}`,
      );
    }
  }
  const rejectInput = (text: string): FinishValidationInput =>
    Object.freeze({ result: text, text, children: Object.freeze([]) });
  const goldenRejects: FinishContractGoldenReject[] = [];
  const addGoldenReject = (validator: FinishValidator, candidate: string) => {
    // Boundary sharp when the boundary candidate actually rejects;
    // the empty text is the fallback for the corner cases (a marker
    // that is a substring of another marker, a pattern that over
    // matches inside its own sample).
    let fixture = rejectInput(candidate);
    if (validator.validate(fixture).ok) {
      fixture = rejectInput('');
    }
    if (validator.validate(fixture).ok) {
      throw new ConfigError(
        `finishContract cannot build a reject golden for '${validator.name}': it accepts ` +
          'both the boundary fixture and the empty text, so it validates nothing',
      );
    }
    goldenRejects.push(Object.freeze({ validator: validator.name, input: fixture }));
  };
  for (const validator of validators) {
    switch (validator.name) {
      case 'contract-sections': {
        if (normalizedSections === undefined) {
          break;
        }
        const last = normalizedSections[normalizedSections.length - 1];
        addGoldenReject(
          validator,
          goldenText
            .split('\n')
            .filter((line) => line !== last)
            .join('\n'),
        );
        break;
      }
      case 'contract-words': {
        const deficit =
          normalizedWords?.min !== undefined
            ? normalizedWords.min - 1
            : (normalizedWords?.max ?? 0) + 1;
        addGoldenReject(validator, Array.from({ length: deficit }, () => FILLER_WORD).join(' '));
        break;
      }
      case 'contract-citations': {
        if (normalizedCitations === undefined) {
          break;
        }
        const sample = normalizedCitations.sample;
        addGoldenReject(
          validator,
          Array.from({ length: (normalizedCitations.min ?? 1) - 1 }, () => sample).join(' '),
        );
        break;
      }
      case 'contract-section-citations': {
        if (normalizedSections === undefined || normalizedCitations === undefined) {
          break;
        }
        const markers = normalizedSections;
        const sample = normalizedCitations.sample;
        const per = normalizedCitations.perSection ?? 1;
        const rows: string[] = [];
        markers.forEach((section, index) => {
          rows.push(section);
          const grant = index === markers.length - 1 ? per - 1 : per;
          if (grant > 0) {
            rows.push(Array.from({ length: grant }, () => sample).join(' '));
          }
        });
        addGoldenReject(validator, rows.join('\n'));
        break;
      }
      default:
        break;
    }
  }

  for (const validator of validators) {
    Object.freeze(validator);
  }
  Object.freeze(validators);
  return Object.freeze({
    manifest: Object.freeze(normalized),
    hash,
    validators,
    promptLines: Object.freeze(promptLines),
    goldenAccept,
    ...(goldenReject === undefined ? {} : { goldenReject }),
    goldenRejects: Object.freeze(goldenRejects),
  });
}

/** Golden fixtures of the construction self test. */
export interface FinishSelfTestFixtures {
  /** Every configured validator must accept this input. */
  accept?: FinishValidationInput;
  /** At least one configured validator must reject this input. */
  reject?: FinishValidationInput;
}

/** One self test failure. */
export interface FinishSelfTestFailure {
  fixture: 'accept' | 'reject';
  /**
   * The failing validator: the rejecting one on the accept side, the
   * named one on a per validator reject golden (cycle 74); absent
   * only on the vacuous single-fixture reject side.
   */
  validator?: string;
  reasons: string[];
}

/** The self test verdict over one validator set. */
export interface FinishSelfTestReport {
  ok: boolean;
  failures: FinishSelfTestFailure[];
}

/**
 * Runs a configured validator set against golden fixtures BEFORE any
 * provider call exists (the v1.71 experiment review, P0.3): the accept
 * fixture must pass every validator (a stale validator rejecting a
 * correct skeleton is exactly the drift the experiment died of, three
 * renamed sections deep into a paid run), and the reject fixture must
 * fail at least one (a set that accepts the known-bad input validates
 * nothing). A validator that THROWS here is a host defect and the
 * ConfigError propagates, the same posture the live loop takes.
 * Deterministic and free: validators are pure synchronous host code by
 * contract, so this costs zero provider calls. `rejects` (cycle 74)
 * carries the contract's per validator reject goldens: for each one
 * the CONFIGURED validator of that name must exist and must reject
 * the fixture, so a same-name replacement weaker than the contract's
 * own validator fails here instead of silently accepting what the
 * journaled contract hash forbids.
 */
export function selfTestFinishValidation(options: {
  validators: readonly FinishValidator[];
  accept?: FinishValidationInput;
  reject?: FinishValidationInput;
  rejects?: readonly FinishContractGoldenReject[];
}): FinishSelfTestReport {
  const run = (validator: FinishValidator, input: FinishValidationInput) => {
    try {
      return validator.validate(input);
    } catch (thrown) {
      throw new ConfigError(
        `finish validator '${validator.name}' threw during the self test instead of ` +
          `returning a verdict: ${thrown instanceof Error ? thrown.message : String(thrown)}`,
      );
    }
  };
  const failures: FinishSelfTestFailure[] = [];
  const accept = options.accept;
  if (accept !== undefined) {
    for (const validator of options.validators) {
      const verdict = run(validator, accept);
      if (!verdict.ok) {
        failures.push({ fixture: 'accept', validator: validator.name, reasons: verdict.reasons });
      }
    }
  }
  const reject = options.reject;
  if (reject !== undefined) {
    const rejected = options.validators.some((validator) => !run(validator, reject).ok);
    if (!rejected) {
      failures.push({
        fixture: 'reject',
        reasons: [
          'every configured validator accepts the known-bad fixture; the validation is vacuous',
        ],
      });
    }
  }
  for (const golden of options.rejects ?? []) {
    const named = options.validators.find((validator) => validator.name === golden.validator);
    if (named === undefined) {
      failures.push({
        fixture: 'reject',
        validator: golden.validator,
        reasons: [
          `no configured validator is named '${golden.validator}', so its reject golden ` +
            'cannot run',
        ],
      });
      continue;
    }
    if (run(named, golden.input).ok) {
      failures.push({
        fixture: 'reject',
        validator: golden.validator,
        reasons: [
          "the configured validator accepts the fixture the contract's own validator " +
            'rejects; a same name replacement must be at least as strict',
        ],
      });
    }
  }
  return { ok: failures.length === 0, failures };
}
