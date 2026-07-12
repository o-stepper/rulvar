/**
 * ModelRetry (M1-T06): a control-flow signal, not an error class. Thrown
 * from a tool's execute to request a model-visible retry: the runtime
 * converts it into an error-flagged tool result carrying the message (and
 * data when present) so the model can self-correct within the same loop.
 * Deliberately outside the error registry; never journaled. Attempts are
 * bounded per tool call chain (default 2); tool
 * consumers arrive with the tool system in M3.
 *
 * Docs: https://docs.rulvar.com/guide/tools
 */
import type { Json } from '../l0/json.js';

export class ModelRetry extends Error {
  readonly data?: Json;

  constructor(message: string, opts?: { data?: Json }) {
    super(message);
    this.name = 'ModelRetry';
    if (opts?.data !== undefined) {
      this.data = opts.data;
    }
  }
}

/** Bounded semantic retries per tool call chain. */
export const DEFAULT_MODEL_RETRY_ATTEMPTS = 2;
