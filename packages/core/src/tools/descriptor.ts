/**
 * The descriptor read behind the research toolset (RV4916).
 *
 * The toolset confines a path by realpath and a stat BEFORE it reads,
 * and the read used to go back to the path: between the containment
 * check and the open, a rename could swap a symlink or another file
 * into the checked name, and the bytes returned belonged to whatever
 * the swap named while the realpath guard vouched for them. The Codex
 * review of 973add91 named that race (no O_NOFOLLOW, no fstat) as the
 * residual risk of the guard. The read now goes through a descriptor:
 * the name is opened with O_NOFOLLOW, which binds the FINAL component
 * on macOS and Linux (a symlink swapped in there fails the open with
 * ELOOP instead of being followed), the open descriptor is fstat'd,
 * and bytes are read only when that descriptor is a regular file whose
 * device and inode equal the identity the check recorded and whose
 * size sits under the caller's bound; the descriptor is closed on every
 * path. Hard links and bind mounts stay outside this guard by design:
 * both name the SAME inode, and no identity comparison can tell them
 * from the checked file.
 *
 * Its own module rather than a function inside research.ts: the core
 * index re exports research.ts wholesale, and this seam is internal,
 * driven directly by the tests and never public API.
 */
import { constants } from 'node:fs';
import { open, type FileHandle } from 'node:fs/promises';

/** The identity a containment check recorded: device and inode. */
export interface FileIdentity {
  dev: bigint;
  ino: bigint;
}

export type IdentifiedReadFailure =
  /** The name resolves to nothing any more (ENOENT, ENOTDIR). */
  | { failure: 'missing' }
  /** O_NOFOLLOW refused the final component: a symlink sits where the checked file was. */
  | { failure: 'symlink' }
  /** The descriptor is not a regular file, or not the checked device and inode. */
  | { failure: 'identity' }
  /** The descriptor's size exceeds the bound. */
  | { failure: 'oversized'; size: bigint }
  /** Any other open or read error, by code. */
  | { failure: 'unreadable'; code: string };

export type IdentifiedRead = { buffer: Buffer } | IdentifiedReadFailure;

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error;
    if (typeof code === 'string') {
      return code;
    }
  }
  return 'UNKNOWN';
}

/**
 * Reads the regular file at `abs` through a descriptor bound to
 * `expected`: the final component may not be a symlink, the descriptor
 * must be a regular file of exactly the expected device and inode, and
 * its size must not exceed `maxBytes`. Never throws; every failure is
 * a typed value the caller renders with the root-relative name.
 */
export async function readIdentifiedFile(
  abs: string,
  expected: FileIdentity,
  maxBytes: number,
): Promise<IdentifiedRead> {
  let handle: FileHandle;
  try {
    // A platform without the flag (Windows) contributes a zero to the
    // OR and opens plainly; the identity comparison below still holds.
    handle = await open(abs, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    const code = errorCode(error);
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return { failure: 'missing' };
    }
    if (code === 'ELOOP' || code === 'EMLINK') {
      return { failure: 'symlink' };
    }
    return { failure: 'unreadable', code };
  }
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile()) {
      return { failure: 'identity' };
    }
    if (opened.dev !== expected.dev || opened.ino !== expected.ino) {
      return { failure: 'identity' };
    }
    if (opened.size > BigInt(maxBytes)) {
      return { failure: 'oversized', size: opened.size };
    }
    return { buffer: await handle.readFile() };
  } catch (error) {
    return { failure: 'unreadable', code: errorCode(error) };
  } finally {
    await handle.close();
  }
}
