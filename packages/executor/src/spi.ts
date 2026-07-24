/**
 * The types shared by the reference executors: the typed failure a
 * provider throws (which the engine surfaces to the model as the call's
 * error tool result), and the side-effect ledger that records every
 * dispatch so a host can bind an approval to the effect it authorized.
 *
 * The provider seam itself (ToolExecutorProvider, IsolatedExecRequest,
 * IsolatedExecContext) is defined in and re-exported from `@rulvar/core`.
 */
import { createHash } from 'node:crypto';
import type { IsolatedExecutorTag } from '@rulvar/core';

/** Why an isolated dispatch failed. */
export type ExecutorErrorCode =
  /** No command could be resolved for the tool. */
  | 'config'
  /** The child exceeded its wall-clock timeout and was killed. */
  | 'timeout'
  /** The run's AbortSignal cancelled the dispatch. */
  | 'aborted'
  /** The child wrote more than the output cap and was killed. */
  | 'output-cap'
  /** The child exited non-zero. */
  | 'exit'
  /** The child's stdout was not the JSON result the protocol requires. */
  | 'protocol'
  /** The child could not be spawned (bad command, missing runtime). */
  | 'spawn';

/**
 * A failed isolated dispatch. The engine catches whatever a
 * ToolExecutorProvider throws and turns it into the call's error tool
 * result, so `message` is what the model sees: it is kept concise and
 * carries a stderr tail on `exit`.
 */
export class ExecutorError extends Error {
  readonly code: ExecutorErrorCode;
  constructor(code: ExecutorErrorCode, message: string) {
    super(message);
    this.name = 'ExecutorError';
    this.code = code;
  }
}

/** One dispatch's side-effect facts, for the ledger. */
export interface ToolEffectRecord {
  /** The stable per-call idempotency key (createEngine derives it). */
  idempotencyKey: string;
  runId: string;
  spanId: string;
  tool: string;
  /** sha256 of the canonical arguments: correlates without storing them. */
  argsHash: string;
  executor: IsolatedExecutorTag;
  /** The ephemeral working directory the dispatch ran in. */
  workdir: string;
  startedAt: number;
  durationMs: number;
  outcome: 'ok' | 'error' | 'timeout';
  /** Child exit code, or null when terminated by a signal. */
  exitCode: number | null;
  /** The terminating signal, when any. */
  signal: string | null;
}

/**
 * The side-effect ledger seam. An executor calls `record` once per
 * dispatch (success or failure). Binding an approval to its effect is
 * then a lookup: the approval entry and the effect share
 * (runId, tool, argsHash), and the idempotency key is stable across a
 * rerun of the same call.
 */
export interface ToolEffectLedger {
  record(entry: ToolEffectRecord): void | Promise<void>;
}

/** An in-memory ledger for tests and single-process hosts. */
export function memoryEffectLedger(): ToolEffectLedger & {
  entries(): readonly ToolEffectRecord[];
} {
  const rows: ToolEffectRecord[] = [];
  return {
    record(entry) {
      rows.push(entry);
    },
    entries() {
      return rows;
    },
  };
}

/**
 * A stable content hash of the arguments for the ledger's `argsHash`. It
 * canonicalizes object key order so equal arguments hash equally
 * regardless of property order.
 */
export function hashArgs(args: unknown): string {
  return createHash('sha256').update(stableStringify(args), 'utf8').digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const body = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(',');
  return `{${body}}`;
}

/**
 * The tool-program result protocol: the child's stdout, trimmed, is the
 * JSON result. Empty stdout is the null result; anything else must parse
 * as JSON or the dispatch fails typed `protocol`. Diagnostics belong on
 * stderr, which never enters the result.
 */
export function parseToolResult(stdout: string, tool: string): unknown {
  const trimmed = stdout.trim();
  if (trimmed === '') return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new ExecutorError(
      'protocol',
      `tool '${tool}' did not write a JSON result to stdout (write diagnostics to stderr)`,
    );
  }
}
