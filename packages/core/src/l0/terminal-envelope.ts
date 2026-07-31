/**
 * The unified terminal envelope (RV1105, the P1-5 arc): ONE shape
 * carrying every fact of a run's terminal, assembled once at the
 * engine's settlement chokepoint and mirrored verbatim onto the
 * resolved outcome (`outcome.envelope`), the `run:end` event
 * (`event.envelope`), and through them the HTTP outcome response and
 * the OTel run attributes. An SDK consumer, an event-only consumer,
 * and an HTTP consumer read the SAME set of facts without assembling
 * pieces from surface-specific fields; nothing pre-existing was
 * renamed or removed, the envelope is an assembly over it.
 *
 * Doctrine notes:
 * - `status` is the computation's verdict; `settled` says whether
 *   anything durable records it (RV907). A resolved outcome always
 *   carries `settled: true`, because an unsettled terminal REJECTS
 *   `handle.result` typed instead of resolving; the `settled: false`
 *   envelopes exist only on the event stream, where `settledReason:
 *   'superseded'` distinguishes the fenced-out segment (RV1009) from
 *   a settlement write fault.
 * - `usageApprox` is normalized to a boolean here (the run:end field
 *   keeps its absent-means-exact byte contract): `true` means some
 *   priced usage was approximate, so `totalUsd` is a lower bound.
 * - `costByModel` is a detached copy of the settled fold's per-model
 *   split; mutating it never touches the cost report.
 *
 * Docs: https://docs.rulvar.com/guide/observability
 */
import type { WireError } from './errors.js';
import type { Usage } from './messages.js';

/** One run terminal, the same on every surface (RV1105). */
export interface TerminalEnvelope {
  /** The run this terminal speaks for. */
  runId: string;
  /** The workflow name the run was started (or resumed) under. */
  workflow: string;
  /** The computed transport status of the run. */
  status: 'ok' | 'error' | 'cancelled' | 'exhausted' | 'suspended';
  /** The typed error, exactly the outcome's, when status is 'error'. */
  error?: WireError;
  /** The semantic completion claim, when the workflow made one. */
  completion?: 'complete' | 'partial' | 'rejected';
  /**
   * Whether anything durable records this terminal (RV907). False only
   * on the event stream: `handle.result` rejects typed instead of
   * resolving an unsettled outcome.
   */
  settled: boolean;
  /** Present only beside `settled: false` when a successor owns settlement (RV1009). */
  settledReason?: 'superseded';
  /** The NET settled fold: what the run recorded as spent. */
  totalUsd: number;
  /** The gross figure with abandoned subtrees included (P1.3). */
  grossUsd: number;
  /** The per-model split of totalUsd, keyed by canonical ModelRef. */
  costByModel: Record<string, number>;
  /** The run's usage aggregate, TTL attribution included. */
  usage: Usage;
  /** True when any priced usage is approximate: totalUsd is a lower bound. */
  usageApprox: boolean;
  /** Agents admitted over the run's lifetime, resume seed included. */
  agentsSpawned: number;
}
