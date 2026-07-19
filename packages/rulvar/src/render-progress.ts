/**
 * Minimal terminal progress renderer (M1-T10): consumes the WorkflowEvent
 * stream of a RunHandle and writes one line per lifecycle fact. Plain
 * lines, no cursor control: readable in CI logs and pipes as well as TTYs.
 *
 * Event stream contract: https://docs.rulvar.com/guide/observability
 * (the terminal progress renderer is one of the four stream consumers).
 *
 * Every emitted line passes through the shared terminal sanitizer before
 * it reaches the sink, so an untrusted provider/tool/log string can never
 * inject a control sequence or a second physical line (v1.21.0 review
 * P2-1).
 */
import { sanitizeTerminalText, type WorkflowEvent } from '@rulvar/core';

export interface RenderProgressOptions {
  /** Line sink; defaults to process.stderr. */
  write?: (line: string) => void;
  /** Include log events (default true; debug level is always skipped). */
  logs?: boolean;
}

function usd(amount: unknown): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return `${value.toFixed(4)} USD`;
}

/**
 * Defensive readers: the input is a raw iterable by contract, so a
 * recognized event with a missing or mistyped field degrades its own
 * line instead of throwing out of the render loop (v1.22.0 review
 * P2-3; same discipline as the live progress reducer).
 */
function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function name(event: { agentType?: string; label?: string }): string {
  const agentType = str(event.agentType) || 'anonymous';
  const label = str(event.label);
  return `${agentType}${label === '' ? '' : ` [${label}]`}`;
}

/**
 * Renders events until the stream ends (the run settled). Returns after
 * the final run:end line.
 */
export async function renderProgress(
  events: AsyncIterable<WorkflowEvent>,
  options?: RenderProgressOptions,
): Promise<void> {
  const sink =
    options?.write ??
    ((line: string) => {
      process.stderr.write(`${line}\n`);
    });
  // One choke point: every line is sanitized before it reaches the sink.
  const write = (line: string): void => sink(sanitizeTerminalText(line));
  const logs = options?.logs ?? true;
  for await (const event of events) {
    switch (event.type) {
      case 'run:start':
        write(
          `run ${str(event.runId)} started: ${str(event.workflow)}${event.resumed === true ? ' (resumed)' : ''}`,
        );
        break;
      case 'phase:start':
        write(`phase: ${str(event.phase)}`);
        break;
      case 'agent:queued':
        write(`agent ${name(event)} queued`);
        break;
      case 'agent:start':
        write(`agent ${name(event)} -> ${str(event.model)} (${str(event.role)})`);
        break;
      case 'agent:end':
        write(
          `agent ${name(event)} ` +
            `${str(event.status)} (${usd(event.costUsd)}, ${String(num(event.usage?.outputTokens))} out tokens)`,
        );
        break;
      case 'agent:error':
        write(
          `agent ${str(event.agentType) || 'anonymous'} error: ${str(event.error?.message)}` +
            `${event.willRetry === true ? ' (will retry)' : ''}`,
        );
        break;
      case 'agent:schema-retry':
        write(
          `agent ${str(event.agentType) || 'anonymous'} schema retry ` +
            `${String(num(event.attempt))}/${String(num(event.maxAttempts))}`,
        );
        break;
      case 'budget:update':
        write(
          `budget: spent ${usd(event.spentUsd)}` +
            (typeof event.remainingUsd === 'number'
              ? `, remaining ${usd(event.remainingUsd)}`
              : ''),
        );
        break;
      case 'log':
        if (logs && event.level !== 'debug') {
          write(`[${str(event.level)}] ${str(event.msg)}`);
        }
        break;
      case 'run:end':
        write(`run finished: ${str(event.status)} (total ${usd(event.totalUsd)})`);
        break;
      default:
        break;
    }
  }
}
