/**
 * modelEpoch capture (M11-T04; docs/05, section "Grounding and
 * decay"). An HONESTLY COARSE signal: the registry version, the
 * price-table version, and the caps hash catch overt model swaps and
 * deprecations; silent alias re-pointing is a documented uncaught case
 * absent probes (the canary fingerprint in @rulvar/evals compensates,
 * and the 30-day TTL on negative eval claims is the no-probe
 * insurance).
 */
import { createHash } from 'node:crypto';

import { jcsSerialize } from '../l0/jcs.js';
import type { ModelCaps } from '../l0/spi/provider.js';
import type { ModelClaim } from '../l0/spi/knowledge.js';

/** Deterministic hash of a caps declaration (JCS + sha256). */
export function capsHashOf(caps: ModelCaps): string {
  return createHash('sha256').update(jcsSerialize(caps), 'utf8').digest('hex');
}

export interface ModelEpochInputs {
  /** Profile-registry snapshot hash or any registry version marker. */
  registryVersion?: string;
  /** The configured PriceTable's pricingVersion. */
  pricingVersion?: string;
  /** The adapter's caps declaration for the subject model. */
  caps?: ModelCaps;
  /** The @rulvar/evals canary fingerprint, when probes ran. */
  canaryFingerprint?: string;
}

/** Builds the optional modelEpoch block; empty inputs give undefined. */
export function modelEpochOf(inputs: ModelEpochInputs): ModelClaim['modelEpoch'] {
  const epoch: NonNullable<ModelClaim['modelEpoch']> = {
    ...(inputs.registryVersion === undefined ? {} : { registryVersion: inputs.registryVersion }),
    ...(inputs.pricingVersion === undefined ? {} : { pricingVersion: inputs.pricingVersion }),
    ...(inputs.caps === undefined ? {} : { capsHash: capsHashOf(inputs.caps) }),
    ...(inputs.canaryFingerprint === undefined
      ? {}
      : { canaryFingerprint: inputs.canaryFingerprint }),
  };
  return Object.keys(epoch).length === 0 ? undefined : epoch;
}
