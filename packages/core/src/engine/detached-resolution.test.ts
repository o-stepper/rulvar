/**
 * The exported detached resolution validator (RV1408): every offline
 * authority (the CLI server's lease-guarded append is the first) must
 * apply the ENGINE'S own flavor-aware validation instead of a
 * lookalike, so an escalation resolves with its own EscalationDecision
 * payload and a plain approval keeps the ApprovalDecision, offline
 * exactly as detached-live.
 */
import { describe, expect, it } from 'vitest';

import { InvalidResolutionError } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import { validateDetachedResolution } from './external.js';

const escalation = {
  seq: 7,
  kind: 'approval',
  status: 'suspended',
  deadlineAt: '2027-01-01T00:00:00.000Z',
  value: { toolName: 'escalate' },
} as unknown as JournalEntry;

/** The RV1203 shape the deadline alone cannot classify: the marker decides. */
const timedApprovalNamedEscalate = {
  seq: 8,
  kind: 'approval',
  status: 'suspended',
  deadlineAt: '2027-01-01T00:00:00.000Z',
  value: { toolName: 'escalate', flavor: 'approval' },
} as unknown as JournalEntry;

const externalWithSchema = {
  seq: 9,
  kind: 'external',
  status: 'suspended',
  value: {
    key: 'gate',
    schema: {
      type: 'object',
      properties: { approved: { type: 'boolean' } },
      required: ['approved'],
    },
  },
} as unknown as JournalEntry;

describe('validateDetachedResolution (RV1408)', () => {
  it('an escalation entry demands the EscalationDecision, never the plain approval payload', async () => {
    await expect(
      validateDetachedResolution(escalation, 'approval:7', { decision: 'allow' }),
    ).rejects.toThrowError(InvalidResolutionError);
    await expect(
      validateDetachedResolution(escalation, 'approval:7', { decision: 'allow' }),
    ).rejects.toThrowError(/EscalationDecision/);
    await expect(
      validateDetachedResolution(escalation, 'approval:7', { kind: 'accept' }),
    ).resolves.toBeUndefined();
  });

  it('a timed approval on a tool literally named escalate keeps the ApprovalDecision: the journaled flavor decides', async () => {
    await expect(
      validateDetachedResolution(timedApprovalNamedEscalate, 'approval:8', { decision: 'allow' }),
    ).resolves.toBeUndefined();
    await expect(
      validateDetachedResolution(timedApprovalNamedEscalate, 'approval:8', { kind: 'accept' }),
    ).rejects.toThrowError(/'allow' \| 'deny'/);
  });

  it('the pinned schema still guards an external resolution', async () => {
    await expect(
      validateDetachedResolution(externalWithSchema, 'gate', { wrong: true }),
    ).rejects.toThrowError(/pinned schema/);
    await expect(
      validateDetachedResolution(externalWithSchema, 'gate', { approved: true }),
    ).resolves.toBeUndefined();
  });
});
