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
 * The runId length ceiling (RV1012): a runId is a filesystem name
 * component and a correlation key, so the cap keeps it comfortably
 * under filesystem name limits with room for store suffixes, and
 * starves length-based smuggling through the unmasked id channel.
 */
export const MAX_RUN_ID_LENGTH = 200;

/**
 * Throws a ConfigError unless runId is a filesystem-safe token: a
 * non-empty string over [A-Za-z0-9._-] that is neither '.' nor '..'
 * (the dot pair passes the alphabet on its own, so it is refused
 * explicitly), no longer than {@link MAX_RUN_ID_LENGTH}.
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
  if (runId.length > MAX_RUN_ID_LENGTH) {
    throw new ConfigError(
      `${context}: runId of length ${String(runId.length)} exceeds the ` +
        `${String(MAX_RUN_ID_LENGTH)}-character ceiling (RV1012)`,
    );
  }
}
