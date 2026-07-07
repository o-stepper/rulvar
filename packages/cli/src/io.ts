/**
 * CLI io seam: every command writes and prompts through this interface
 * so the e2e suite drives the real command paths in-process with
 * scripted stdin and captured output (docs/02, section 8.1: the CLI is
 * a shell strictly on top of the public APIs).
 */
import { createInterface } from 'node:readline';

export interface CliIo {
  out(line: string): void;
  err(line: string): void;
  /**
   * Asks one question and resolves with the answer line, or undefined
   * when input is exhausted (EOF): the caller leaves the run suspended.
   */
  prompt(question: string): Promise<string | undefined>;
  /** TTY-aware renderers may switch between live and plain output. */
  isTTY: boolean;
}

/** The process-backed io the bin entry uses. */
export function processIo(): CliIo {
  return {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
    isTTY: process.stdout.isTTY === true,
    prompt: (question) =>
      new Promise((resolve) => {
        const rl = createInterface({ input: process.stdin, output: process.stderr });
        let settled = false;
        rl.question(`${question} `, (answer) => {
          settled = true;
          rl.close();
          resolve(answer);
        });
        rl.on('close', () => {
          if (!settled) {
            resolve(undefined);
          }
        });
      }),
  };
}
