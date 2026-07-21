/**
 * Run id containment (v1.36.0 review SEC-P1). A runId becomes both a
 * journal path component (JsonlFileStore.safeName) and the PREFIX of every
 * transcript ref (checkpointRefFor, workflowSourceRef append `/...`). The
 * journal's whole-token regex rejects a separator, but a bare '.' or '..'
 * slips through as a single component there and, once a '/suffix' is
 * appended, becomes a real traversal segment at the transcript store. The
 * engine validates the runId at its boundary, before the first transcript
 * write, so an untrusted runId is refused with a typed ConfigError instead
 * of escaping the configured transcript root.
 */
import { ConfigError } from './errors.js';

/** Filesystem-safe token: the journal store's own alphabet. */
const SAFE_RUN_ID = /^[A-Za-z0-9._-]+$/;

/**
 * Throws a ConfigError unless runId is a filesystem-safe token: a
 * non-empty string over [A-Za-z0-9._-] that is neither '.' nor '..'. The
 * dot pair passes the alphabet on its own, so it is refused explicitly.
 */
export function assertSafeRunId(runId: string, context: string): void {
  if (
    typeof runId !== 'string' ||
    runId === '' ||
    runId === '.' ||
    runId === '..' ||
    !SAFE_RUN_ID.test(runId)
  ) {
    throw new ConfigError(
      `${context}: runId ${JSON.stringify(runId)} is not filesystem-safe ` +
        '(allowed: [A-Za-z0-9._-], and neither "." nor "..")',
    );
  }
}
