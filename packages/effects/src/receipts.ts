/**
 * Receipt verification against a declared trust envelope (plan 45,
 * rfcs/effects.md section 7). A receipt confirms an effect only after
 * verification; every failure mode classifies `unverified`, which the
 * fold routes to `unknown`, never to `confirmed` and never to silent
 * discard. The envelope declares WHO may sign (issuers), WHAT a
 * receipt must bind (per effect class), and WHICH keys verify inside
 * which validity windows; a revoked key fails from its revocation time
 * forward.
 */
import type { EffectClass } from '@rulvar/core';

import type { EffectReceiptObservation } from './adapter.js';

export interface EffectTrustKey {
  keyId: string;
  /** ISO instant; absent means valid from the beginning of time. */
  validFrom?: string;
  /** ISO instant; absent means no scheduled end. */
  validTo?: string;
  /** ISO instant; the key fails verification from here FORWARD. */
  revokedAt?: string;
}

export interface EffectTrustEnvelope {
  /** Principals or provider identities that may sign receipts. */
  issuers: readonly string[];
  keys: readonly EffectTrustKey[];
  /**
   * Host-supplied signature check over the observation and the resolved
   * key. Absent means structural verification only (presence of a
   * signature field), which is the conformance posture; production
   * hosts supply real cryptography here.
   */
  verifySignature?: (observation: EffectReceiptObservation, key: EffectTrustKey) => boolean;
}

export type ReceiptVerification =
  { verification: 'verified' } | { verification: 'unverified'; reason: string };

/** The fields a receipt must bind, per effect class (RFC section 7). */
function missingBindings(
  effectClass: EffectClass,
  observation: EffectReceiptObservation,
): string[] {
  const missing: string[] = [];
  const need = (name: string, value: unknown): void => {
    if (value === undefined) {
      missing.push(name);
    }
  };
  need('timestamp', observation.timestamp);
  if (effectClass === 'monetary') {
    need('transferId', observation.transferId);
    need('amount', observation.amount);
    need('currency', observation.currency);
  } else if (effectClass === 'signing') {
    need('documentHash', observation.documentHash);
  } else {
    need('providerRef', observation.providerRef);
  }
  return missing;
}

/**
 * Verifies one receipt observation against the envelope. The order of
 * checks is the RFC's: issuer identity, content bindings, key
 * resolution with validity windows, revocation, then the signature
 * itself. A receipt that binds fewer fields than its class requires
 * verifies `unverified` no matter how good its signature is.
 */
export function verifyReceiptObservation(
  observation: EffectReceiptObservation,
  effectClass: EffectClass,
  envelope: EffectTrustEnvelope,
): ReceiptVerification {
  if (observation.issuer === undefined || !envelope.issuers.includes(observation.issuer)) {
    return {
      verification: 'unverified',
      reason: `issuer '${observation.issuer ?? '<none>'}' is not in the trust envelope`,
    };
  }
  const missing = missingBindings(effectClass, observation);
  if (missing.length > 0) {
    return {
      verification: 'unverified',
      reason:
        `the receipt binds fewer fields than the '${effectClass}' class requires: ` +
        `missing ${missing.join(', ')}`,
    };
  }
  const key = envelope.keys.find((k) => k.keyId === observation.keyId);
  if (key === undefined) {
    return {
      verification: 'unverified',
      reason: `key '${observation.keyId ?? '<none>'}' does not resolve in the key set`,
    };
  }
  const at = observation.timestamp ?? '';
  if (key.validFrom !== undefined && at < key.validFrom) {
    return {
      verification: 'unverified',
      reason: `the receipt predates key '${key.keyId}' validity (${key.validFrom})`,
    };
  }
  if (key.validTo !== undefined && at > key.validTo) {
    return {
      verification: 'unverified',
      reason: `the receipt postdates key '${key.keyId}' validity (${key.validTo})`,
    };
  }
  if (key.revokedAt !== undefined && at >= key.revokedAt) {
    return {
      verification: 'unverified',
      reason:
        `key '${key.keyId}' is revoked from ${key.revokedAt} forward; old receipts ` +
        'inside their window still verify, this one does not',
    };
  }
  if (observation.signature === undefined) {
    return { verification: 'unverified', reason: 'the receipt carries no signature' };
  }
  if (envelope.verifySignature !== undefined && !envelope.verifySignature(observation, key)) {
    return { verification: 'unverified', reason: 'the signature failed verification' };
  }
  return { verification: 'verified' };
}

/** Adapts an envelope to the dispatcher's ReceiptVerifier seam. */
export function envelopeVerifier(
  effectClass: EffectClass,
  envelope: EffectTrustEnvelope,
): (observation: EffectReceiptObservation) => 'verified' | 'unverified' {
  return (observation) => verifyReceiptObservation(observation, effectClass, envelope).verification;
}
