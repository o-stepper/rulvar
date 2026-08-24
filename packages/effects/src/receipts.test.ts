/**
 * The trust envelope (plan 45, rfcs/effects.md section 7): every
 * failure mode classifies unverified, which routes to unknown, never
 * to confirmed and never to silent discard.
 */
import { describe, expect, it } from 'vitest';

import type { EffectReceiptObservation } from './adapter.js';
import {
  envelopeVerifier,
  verifyReceiptObservation,
  type EffectTrustEnvelope,
} from './receipts.js';

const ENVELOPE: EffectTrustEnvelope = {
  issuers: ['acme-bank'],
  keys: [
    { keyId: 'k-live', validFrom: '2026-01-01T00:00:00.000Z' },
    { keyId: 'k-old', validFrom: '2025-01-01T00:00:00.000Z', validTo: '2026-01-01T00:00:00.000Z' },
    { keyId: 'k-revoked', revokedAt: '2026-06-01T00:00:00.000Z' },
  ],
};

const GOOD: EffectReceiptObservation = {
  transferId: 't-1',
  amount: 100,
  currency: 'EUR',
  timestamp: '2026-08-24T10:00:30.000Z',
  issuer: 'acme-bank',
  keyId: 'k-live',
  signature: 'sig',
};

describe('verifyReceiptObservation', () => {
  it('verifies the fully bound, in-window, signed monetary receipt', () => {
    expect(verifyReceiptObservation(GOOD, 'monetary', ENVELOPE)).toEqual({
      verification: 'verified',
    });
  });

  it('refuses an issuer outside the envelope', () => {
    const verdict = verifyReceiptObservation(
      { ...GOOD, issuer: 'shadow-bank' },
      'monetary',
      ENVELOPE,
    );
    expect(verdict.verification).toBe('unverified');
    expect(verdict.verification === 'unverified' && verdict.reason).toContain('shadow-bank');
  });

  it('a receipt that binds fewer fields than its class requires verifies unverified', () => {
    const monetary = verifyReceiptObservation({ ...GOOD, amount: undefined }, 'monetary', ENVELOPE);
    expect(monetary.verification).toBe('unverified');
    expect(monetary.verification === 'unverified' && monetary.reason).toContain('amount');
    const signing = verifyReceiptObservation(GOOD, 'signing', ENVELOPE);
    expect(signing.verification).toBe('unverified');
    expect(signing.verification === 'unverified' && signing.reason).toContain('documentHash');
    const caseClass = verifyReceiptObservation(
      { ...GOOD, providerRef: undefined },
      'case',
      ENVELOPE,
    );
    expect(caseClass.verification).toBe('unverified');
  });

  it('resolves keys against validity windows: rotation keeps old receipts verifying', () => {
    const inOldWindow = verifyReceiptObservation(
      { ...GOOD, keyId: 'k-old', timestamp: '2025-06-01T00:00:00.000Z' },
      'monetary',
      ENVELOPE,
    );
    expect(inOldWindow.verification).toBe('verified');
    const pastOldWindow = verifyReceiptObservation(
      { ...GOOD, keyId: 'k-old' },
      'monetary',
      ENVELOPE,
    );
    expect(pastOldWindow.verification).toBe('unverified');
    const unknownKey = verifyReceiptObservation({ ...GOOD, keyId: 'k-none' }, 'monetary', ENVELOPE);
    expect(unknownKey.verification).toBe('unverified');
  });

  it('a revoked key fails from its revocation time forward, not before', () => {
    const before = verifyReceiptObservation(
      { ...GOOD, keyId: 'k-revoked', timestamp: '2026-05-01T00:00:00.000Z' },
      'monetary',
      ENVELOPE,
    );
    expect(before.verification).toBe('verified');
    const after = verifyReceiptObservation({ ...GOOD, keyId: 'k-revoked' }, 'monetary', ENVELOPE);
    expect(after.verification).toBe('unverified');
    expect(after.verification === 'unverified' && after.reason).toContain('revoked');
  });

  it('demands a signature and honors the host verifier verbatim', () => {
    const unsigned = verifyReceiptObservation(
      { ...GOOD, signature: undefined },
      'monetary',
      ENVELOPE,
    );
    expect(unsigned.verification).toBe('unverified');
    const failing = verifyReceiptObservation(GOOD, 'monetary', {
      ...ENVELOPE,
      verifySignature: () => false,
    });
    expect(failing.verification).toBe('unverified');
    expect(failing.verification === 'unverified' && failing.reason).toContain('signature');
  });

  it('envelopeVerifier adapts to the dispatcher seam', () => {
    const verifier = envelopeVerifier('monetary', ENVELOPE);
    expect(verifier(GOOD)).toBe('verified');
    expect(verifier({ ...GOOD, issuer: 'shadow-bank' })).toBe('unverified');
  });
});
