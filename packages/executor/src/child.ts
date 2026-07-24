/**
 * The shared child-process runner both reference executors build on. It
 * owns the parts that must be exactly right for isolation to hold: a
 * replaced (not inherited) environment, a hard wall-clock timeout that
 * escalates SIGTERM to SIGKILL, cancellation via the run's AbortSignal,
 * and a hard cap on captured output so a runaway child cannot exhaust
 * host memory. Nothing here decides policy; subprocess.ts and
 * container.ts assemble the command and environment and interpret the
 * result.
 */
import { spawn } from 'node:child_process';

export interface ChildSpec {
  command: string;
  args: readonly string[];
  /**
   * The child's COMPLETE environment. It replaces the host environment
   * rather than extending it: whatever is not listed here is absent from
   * the child, which is how host credentials in process.env are kept out
   * of the tool.
   */
  env: Record<string, string>;
  cwd: string;
  /** Written to the child's stdin, which is then closed. */
  stdinData: string;
  /** Hard wall-clock ceiling; on expiry the child is SIGTERM'd then SIGKILL'd. */
  timeoutMs: number;
  /** Grace between SIGTERM and the SIGKILL that follows if it ignores it. */
  killGraceMs: number;
  /** Captured stdout/stderr are each bounded to this many bytes. */
  maxOutputBytes: number;
  /** Cancels the child immediately when it fires (run abort, budget, limits). */
  signal?: AbortSignal;
}

export type ChildStopReason = 'timeout' | 'aborted' | 'output-cap';

export interface ChildResult {
  stdout: string;
  stderr: string;
  /** Process exit code; null when the child was terminated by a signal. */
  code: number | null;
  /** The terminating signal, when any. */
  signal: NodeJS.Signals | null;
  /** True when the runner (not the child) ended it, with the reason why. */
  stopped: boolean;
  reason?: ChildStopReason;
}

/**
 * Spawns one child and resolves with its captured output and exit status,
 * or rejects if the process could not be spawned at all (e.g. the command
 * is a bare name and PATH is not in `env`, so it cannot be resolved). A
 * child that exits non-zero or is killed resolves normally; interpreting
 * that is the caller's job.
 */
export function runChildProcess(spec: ChildSpec): Promise<ChildResult> {
  return new Promise<ChildResult>((resolve, reject) => {
    let child;
    try {
      child = spawn(spec.command, [...spec.args], {
        cwd: spec.cwd,
        env: spec.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stopped = false;
    let reason: ChildStopReason | undefined;
    let settled = false;
    const timers: { kill?: ReturnType<typeof setTimeout>; grace?: ReturnType<typeof setTimeout> } =
      {};

    const clearTimers = (): void => {
      if (timers.kill !== undefined) clearTimeout(timers.kill);
      if (timers.grace !== undefined) clearTimeout(timers.grace);
      if (spec.signal !== undefined) spec.signal.removeEventListener('abort', onAbort);
    };
    const escalateKill = (): void => {
      // SIGTERM first so a well-behaved child can flush and exit; the
      // SIGKILL after the grace window is the guarantee it stops.
      timers.grace = setTimeout(() => {
        child.kill('SIGKILL');
      }, spec.killGraceMs);
      child.kill('SIGTERM');
    };
    const stop = (why: ChildStopReason): void => {
      if (stopped) return;
      stopped = true;
      reason = why;
      escalateKill();
    };
    function onAbort(): void {
      stop('aborted');
    }

    timers.kill = setTimeout(() => stop('timeout'), spec.timeoutMs);
    if (spec.signal !== undefined) {
      if (spec.signal.aborted) stop('aborted');
      else spec.signal.addEventListener('abort', onAbort);
    }

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdoutBytes >= spec.maxOutputBytes) return;
      const room = spec.maxOutputBytes - stdoutBytes;
      stdoutChunks.push(chunk.length > room ? chunk.subarray(0, room) : chunk);
      stdoutBytes += Math.min(chunk.length, room);
      if (stdoutBytes >= spec.maxOutputBytes) stop('output-cap');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderrBytes >= spec.maxOutputBytes) return;
      const room = spec.maxOutputBytes - stderrBytes;
      stderrChunks.push(chunk.length > room ? chunk.subarray(0, room) : chunk);
      stderrBytes += Math.min(chunk.length, room);
    });
    child.on('error', (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimers();
      reject(err);
    });
    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return;
      settled = true;
      clearTimers();
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        code,
        signal,
        stopped,
        ...(reason === undefined ? {} : { reason }),
      });
    });

    // A child that exits before draining stdin makes the write EPIPE;
    // that is not our error to raise, the close/exit status already tells
    // the story.
    child.stdin.on('error', () => undefined);
    child.stdin.end(spec.stdinData);
  });
}
