/**
 * TUI progress renderer over the WorkflowEvent stream. Line-oriented: one compact line per
 * lifecycle event, replay-marked events dimmed with a prefix, a cost
 * and usage summary at run:end. TTY gets no special screen handling in
 * v1 beyond being the default sink; piped output stays byte-stable for
 * tests and logs.
 */
import { sanitizeTerminalText, type RunHandle, type WorkflowEvent } from '@rulvar/core';

import type { CliIo } from './io.js';

function money(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

/**
 * Renders one event to a line, or undefined for silent event types. The
 * composed line is sanitized so an untrusted provider/tool/log string
 * cannot inject a control sequence or a second physical line (v1.21.0
 * review P2-1).
 */
export function renderEventLine(event: WorkflowEvent): string | undefined {
  const line = rawEventLine(event);
  return line === undefined ? undefined : sanitizeTerminalText(line);
}

function rawEventLine(event: WorkflowEvent): string | undefined {
  const replayMark = event.replayed === true ? 'replay ' : '';
  switch (event.type) {
    case 'run:start':
      return `run ${event.runId} ${event.resumed ? 'resumed' : 'started'} (workflow ${event.workflow})`;
    case 'phase:start':
      return `phase ${event.phase}`;
    case 'agent:start':
      return `${replayMark}agent ${event.agentType || '(anon)'}${event.label === undefined ? '' : ` [${event.label}]`} ${event.role} on ${event.model}`;
    case 'agent:end':
      return `${replayMark}agent ${event.agentType || '(anon)'} ${event.status} (${money(event.costUsd)}, ${event.usage.inputTokens + event.usage.outputTokens} tok)`;
    case 'agent:error':
      return `agent ${event.agentType || '(anon)'} error: ${event.error.message}${event.willRetry ? ' (will retry)' : ''}`;
    case 'agent:queued':
      return `agent ${event.agentType || '(anon)'} queued`;
    case 'tool:start':
      return `${replayMark}tool ${event.toolName}`;
    case 'tool:end':
      return `${replayMark}tool ${event.toolName} ${event.outcome} (${event.durationMs}ms)`;
    case 'approval:pending':
      return `approval pending: tool ${event.toolName} (entry ${event.entryRef})`;
    case 'log':
      return event.level === 'debug' ? undefined : `${event.level}: ${event.msg}`;
    case 'run:end':
      return `run ${event.runId} ${event.status}`;
    default:
      return undefined;
  }
}

/** Attaches the renderer to a handle's event stream; returns a detach. */
export function attachProgress(handle: RunHandle<unknown>, io: CliIo): () => void {
  const detachers: Array<() => void> = [];
  const forward = (event: WorkflowEvent): void => {
    const line = renderEventLine(event);
    if (line !== undefined) {
      io.err(line);
    }
  };
  // The typed on() surface is per event type; iterate the vocabulary we
  // render instead of consuming the single events AsyncIterable, which
  // the command may hand to other consumers.
  for (const type of [
    'run:start',
    'phase:start',
    'agent:start',
    'agent:end',
    'agent:error',
    'agent:queued',
    'tool:start',
    'tool:end',
    'approval:pending',
    'log',
    'run:end',
  ] as const) {
    detachers.push(handle.on(type, forward));
  }
  return () => {
    for (const detach of detachers) {
      detach();
    }
  };
}
