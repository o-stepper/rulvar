/**
 * The atomic claim map of the composition (RV4305, P2.1 of the sixth
 * comparison experiment's improvement plan). Under the opt-in
 * `synthesis.claimMap: true` the composition's finish carries, beside
 * the document, a typed map of its material claims: each row names the
 * claim, its evidentiary grade, and the source anchors it rests on.
 *
 * The layer split is the whole design (the review's own blocker): a
 * DETERMINISTIC validator can judge the map's STRUCTURE, and only its
 * structure. Whether a grade is TRUE (whether an 'inference' really
 * follows, whether a 'source' row really restates its anchor) is
 * semantic truth, and semantic truth stays with the judges: the map is
 * fed into the existing claim judge's prompt under the same opt-in,
 * and no new judge and no new rounds exist. What this module refuses
 * is exactly what structure can prove: an anchor cited by the document
 * but absent from the map, a map anchor the document never cites, two
 * non-source rows leaning on one anchor, an inference with no recorded
 * bridge, a live observation with no run evidence, an unanchored claim
 * that refuses to call itself an assumption.
 */
import { createHash } from 'node:crypto';

import { jcsSerialize } from '../l0/jcs.js';
import type { SchemaSpec } from '../l0/schema.js';
import { DEFAULT_CITATION_PATTERN } from './finish-validators.js';

/** The evidentiary grades of a composed claim (P2.1's vocabulary). */
export type ClaimGrade = 'source' | 'inference' | 'assumption' | 'live-observed';

/** One row of the composition's claim map. */
export interface ClaimMapRow {
  /** Unique within the map; the judge and the journal address rows by it. */
  id: string;
  /** The atomic claim, one assertion, never a compound sentence. */
  claim: string;
  grade: ClaimGrade;
  /** The document anchors (`path:line`) this claim rests on; empty only on 'assumption'. */
  sourceAnchors: readonly string[];
  /** Required exactly on 'inference': the bridge lives here, the grade never replaces it. */
  inference?: { premises: readonly string[]; reasoning: string };
  /** Required exactly on 'live-observed': what the run itself recorded. */
  runEvidence?: string;
}

/** The map bounds; enforced by the finish schema, restated here for readers. */
export const CLAIM_MAP_MAX_CLAIMS = 200;
export const CLAIM_MAP_MAX_ANCHORS_PER_CLAIM = 12;
export const CLAIM_MAP_MAX_CLAIM_CHARS = 600;

/**
 * The claimMap rows' JSON schema fragment (RV4305): shape and bounds
 * only. The RELATIONAL rules (anchor bidirectionality, one non-source
 * row per anchor, per-grade required blocks) are
 * {@link validateClaimMapStructure}'s, because a JSON schema cannot
 * read the document the map describes.
 */
export const CLAIM_MAP_ROWS_SCHEMA: SchemaSpec = {
  type: 'array',
  maxItems: CLAIM_MAP_MAX_CLAIMS,
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'claim', 'grade', 'sourceAnchors'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 64 },
      claim: { type: 'string', minLength: 1, maxLength: CLAIM_MAP_MAX_CLAIM_CHARS },
      grade: { type: 'string', enum: ['source', 'inference', 'assumption', 'live-observed'] },
      sourceAnchors: {
        type: 'array',
        maxItems: CLAIM_MAP_MAX_ANCHORS_PER_CLAIM,
        items: { type: 'string', minLength: 1, maxLength: 256 },
      },
      inference: {
        type: 'object',
        additionalProperties: false,
        required: ['premises', 'reasoning'],
        properties: {
          premises: {
            type: 'array',
            minItems: 1,
            maxItems: 12,
            items: { type: 'string', minLength: 1, maxLength: 600 },
          },
          reasoning: { type: 'string', minLength: 1, maxLength: 1200 },
        },
      },
      runEvidence: { type: 'string', minLength: 1, maxLength: 600 },
    },
  },
};

const MAX_LISTED = 12;

const listCapped = (values: string[]): string => {
  const listed = values.slice(0, MAX_LISTED).join(', ');
  return values.length > MAX_LISTED
    ? `${listed}, and ${String(values.length - MAX_LISTED)} more`
    : listed;
};

/** Extracts the document's distinct citation anchors, in order. */
export function documentAnchorsOf(documentText: string, pattern?: string): readonly string[] {
  const matcher = new RegExp(pattern ?? DEFAULT_CITATION_PATTERN, 'g');
  const seen = new Set<string>();
  for (const match of documentText.matchAll(matcher)) {
    seen.add(match[0]);
  }
  return [...seen];
}

/**
 * The structural verdict over a schema-valid claim map (RV4305):
 * deterministic, relational, and HONEST about its own limits. Every
 * reason names the offending rows or anchors so a rejected finish is
 * repairable from the feedback alone. This function never judges
 * whether a grade is true; that is the claim judge's question.
 */
export function validateClaimMapStructure(
  rows: readonly ClaimMapRow[],
  documentText: string,
  pattern?: string,
): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  // Unique ids: the journal and the judge address rows by them.
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  for (const row of rows) {
    if (ids.has(row.id)) {
      duplicateIds.push(row.id);
    }
    ids.add(row.id);
  }
  if (duplicateIds.length > 0) {
    reasons.push(`claim ids must be unique; duplicated: ${listCapped(duplicateIds)}`);
  }
  // The per-grade required blocks: the grade never replaces the bridge.
  const inferenceMissing: string[] = [];
  const inferenceStray: string[] = [];
  const evidenceMissing: string[] = [];
  const evidenceStray: string[] = [];
  const unanchoredNotAssumption: string[] = [];
  const anchoredAssumption: string[] = [];
  const sourceWithoutAnchor: string[] = [];
  for (const row of rows) {
    if (row.grade === 'inference' && row.inference === undefined) {
      inferenceMissing.push(row.id);
    }
    if (row.grade !== 'inference' && row.inference !== undefined) {
      inferenceStray.push(row.id);
    }
    if (row.grade === 'live-observed' && row.runEvidence === undefined) {
      evidenceMissing.push(row.id);
    }
    if (row.grade !== 'live-observed' && row.runEvidence !== undefined) {
      evidenceStray.push(row.id);
    }
    if (row.grade === 'source' && row.sourceAnchors.length === 0) {
      sourceWithoutAnchor.push(row.id);
    }
    if (row.grade === 'assumption' && row.sourceAnchors.length > 0) {
      anchoredAssumption.push(row.id);
    }
    if (
      row.sourceAnchors.length === 0 &&
      row.runEvidence === undefined &&
      row.grade !== 'assumption'
    ) {
      unanchoredNotAssumption.push(row.id);
    }
  }
  if (inferenceMissing.length > 0) {
    reasons.push(
      `grade 'inference' requires the inference block (premises, reasoning); the bridge ` +
        `lives in it, the grade never replaces it: ${listCapped(inferenceMissing)}`,
    );
  }
  if (inferenceStray.length > 0) {
    reasons.push(
      `an inference block belongs only on grade 'inference' rows: ${listCapped(inferenceStray)}`,
    );
  }
  if (evidenceMissing.length > 0) {
    reasons.push(
      `grade 'live-observed' requires runEvidence naming what the run recorded: ` +
        listCapped(evidenceMissing),
    );
  }
  if (evidenceStray.length > 0) {
    reasons.push(
      `runEvidence belongs only on grade 'live-observed' rows: ${listCapped(evidenceStray)}`,
    );
  }
  if (sourceWithoutAnchor.length > 0) {
    reasons.push(
      `grade 'source' requires at least one sourceAnchor: ${listCapped(sourceWithoutAnchor)}`,
    );
  }
  if (anchoredAssumption.length > 0) {
    reasons.push(
      `grade 'assumption' must carry no sourceAnchors (an anchored claim is not an ` +
        `assumption): ${listCapped(anchoredAssumption)}`,
    );
  }
  if (unanchoredNotAssumption.length > 0) {
    reasons.push(
      `a row with no sourceAnchors and no runEvidence must declare grade 'assumption': ` +
        listCapped(unanchoredNotAssumption),
    );
  }
  // The bidirectional anchor coverage (RV4305): the document and the
  // map describe the same evidence set, in both directions.
  const documentAnchors = documentAnchorsOf(documentText, pattern);
  const mapAnchors = new Set<string>();
  for (const row of rows) {
    for (const anchor of row.sourceAnchors) {
      mapAnchors.add(anchor);
    }
  }
  const uncovered = documentAnchors.filter((anchor) => !mapAnchors.has(anchor));
  if (uncovered.length > 0) {
    reasons.push(
      `the document cites anchors the map never covers: ${listCapped(uncovered)}; every ` +
        `document anchor must appear in some row's sourceAnchors`,
    );
  }
  const documentSet = new Set(documentAnchors);
  const phantom = [...mapAnchors].filter((anchor) => !documentSet.has(anchor));
  if (phantom.length > 0) {
    reasons.push(
      `the map cites anchors the document never carries: ${listCapped(phantom)}; a map ` +
        `anchor must appear in the composed document`,
    );
  }
  // At most ONE non-source row per anchor: a STRUCTURAL count of rows,
  // deliberately not a semantic verdict about any of them.
  const nonSourceByAnchor = new Map<string, string[]>();
  for (const row of rows) {
    if (row.grade === 'source') {
      continue;
    }
    for (const anchor of row.sourceAnchors) {
      const holders = nonSourceByAnchor.get(anchor) ?? [];
      holders.push(row.id);
      nonSourceByAnchor.set(anchor, holders);
    }
  }
  const overloaded = [...nonSourceByAnchor.entries()].filter(([, holders]) => holders.length > 1);
  if (overloaded.length > 0) {
    reasons.push(
      `at most one non-source row may lean on one anchor (a structural count, never a ` +
        `semantic verdict); overloaded: ` +
        listCapped(overloaded.map(([anchor, holders]) => `${anchor} (rows ${holders.join(', ')})`)),
    );
  }
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

/**
 * The canonical form of an accepted map (RV4305): rows sorted by id
 * (a stable, content-independent order), serialized by the JCS recipe
 * every other canonical byte surface in this codebase uses. The
 * journal decision records this form, and the hash names it.
 */
export function canonicalClaimMap(rows: readonly ClaimMapRow[]): ClaimMapRow[] {
  return [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** sha256 over the JCS bytes of the canonical map. */
export function claimMapHashOf(rows: readonly ClaimMapRow[]): string {
  return createHash('sha256')
    .update(jcsSerialize(canonicalClaimMap(rows)), 'utf8')
    .digest('hex');
}
