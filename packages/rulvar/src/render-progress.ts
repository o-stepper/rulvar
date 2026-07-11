/**
 * Minimal terminal progress renderer (M1-T10): consumes the WorkflowEvent
 * stream of a RunHandle and writes one line per lifecycle fact. Plain
 * lines, no cursor control: readable in CI logs and pipes as well as TTYs.
 *
 * Owning spec: docs/09-observability-testing-spec.md, section "Event
 * stream" (the terminal progress renderer is one of the four stream
 * consumers).
 */
import type { WorkflowEvent } from '@rulvar/core';

export interface RenderProgressOptions {
  /** Line sink; defaults to process.stderr. */
  write?: (line: string) => void;
  /** Include log events (default true; debug level is always skipped). */
  logs?: boolean;
}

function usd(amount: number): string {
  return `${amount.toFixed(4)} USD`;
}

/**
 * Renders events until the stream ends (the run settled). Returns after
 * the final run:end line.
 */
export async function renderProgress(
  events: AsyncIterable<WorkflowEvent>,
  options?: RenderProgressOptions,
): Promise<void> {
  const write =
    options?.write ??
    ((line: string) => {
      process.stderr.write(`${line}\n`);
    });
  const logs = options?.logs ?? true;
  for await (const event of events) {
    switch (event.type) {
      case 'run:start':
        write(`run ${event.runId} started: ${event.workflow}${event.resumed ? ' (resumed)' : ''}`);
        break;
      case 'phase:start':
        write(`phase: ${event.phase}`);
        break;
      case 'agent:queued':
        write(
          `agent ${event.agentType || 'anonymous'}${event.label ? ` [${event.label}]` : ''} queued`,
        );
        break;
      case 'agent:start':
        write(
          `agent ${event.agentType || 'anonymous'}${event.label ? ` [${event.label}]` : ''} ` +
            `-> ${event.model} (${event.role})`,
        );
        break;
      case 'agent:end':
        write(
          `agent ${event.agentType || 'anonymous'}${event.label ? ` [${event.label}]` : ''} ` +
            `${event.status} (${usd(event.costUsd)}, ${event.usage.outputTokens} out tokens)`,
        );
        break;
      case 'agent:error':
        write(
          `agent ${event.agentType || 'anonymous'} error: ${event.error.message}` +
            `${event.willRetry ? ' (will retry)' : ''}`,
        );
        break;
      case 'agent:schema-retry':
        write(
          `agent ${event.agentType || 'anonymous'} schema retry ${event.attempt}/${event.maxAttempts}`,
        );
        break;
      case 'budget:update':
        write(
          `budget: spent ${usd(event.spentUsd)}` +
            (event.remainingUsd === null ? '' : `, remaining ${usd(event.remainingUsd)}`),
        );
        break;
      case 'log':
        if (logs && event.level !== 'debug') {
          write(`[${event.level}] ${event.msg}`);
        }
        break;
      case 'run:end':
        write(`run finished: ${event.status} (total ${usd(event.totalUsd)})`);
        break;
      default:
        break;
    }
  }
}
