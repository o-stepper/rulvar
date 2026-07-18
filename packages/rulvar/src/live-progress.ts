/**
 * Live terminal progress view (v1.21.0): a claude-workflows-style tree
 * over the WorkflowEvent stream, one row per agent with a status glyph,
 * a running timer, token counts, and USD, plus per-role sub-timings when
 * one agent call spans several invocation phases (loop, summarize,
 * finalize, extract). The minimal line-per-event `renderProgress` stays
 * untouched next door; this renderer is the rich, cursor-addressed
 * sibling with an append-only fallback for pipes and CI.
 *
 * Honesty rules inherited from the event contract
 * (https://docs.rulvar.com/guide/observability): exact token counts
 * exist only at `agent:end`, so running rows show elapsed time and a
 * tilde-marked character estimate from `agent:stream` deltas; run-level
 * USD is live through `budget:update`; per-role dollars appear in the
 * final summary only when the source is a RunHandle (they come from
 * `RunOutcome.cost.byRole`, not from any event). Replayed lifecycle
 * events render dim with a `replay` tag, never spin, and never add to
 * totals: the authoritative money numbers are `budget:update.spentUsd`
 * and `run:end.totalUsd`, which are immune to replay double counting.
 *
 * The reducer is defensive by contract: unknown event types and missing
 * fields are tolerated silently (consumers MUST tolerate them), an
 * unknown parent span attaches at the root, and a mid-run attach
 * synthesizes a root instead of failing.
 */
import type { CostReport, RunHandle, WorkflowEvent } from '@rulvar/core';

/** Raw output sink; chunks may contain ANSI and partial lines. */
export interface ProgressSink {
  write(chunk: string): void;
  isTTY?: boolean;
  columns?: number;
  rows?: number;
}

/** Injectable time source; every() returns a cancel function. */
export interface ProgressClock {
  now(): number;
  every(ms: number, fn: () => void): () => void;
}

export type ProgressMode = 'auto' | 'tty' | 'lines' | 'off';

export interface ProgressOptions {
  /** Defaults to process.stderr so application stdout stays clean. */
  sink?: ProgressSink;
  /** Defaults to Date.now plus setInterval. */
  clock?: ProgressClock;
  /**
   * 'auto' (default) picks 'tty' when the sink reports a TTY and the
   * environment is not CI or TERM=dumb, else 'lines'.
   */
  mode?: ProgressMode;
  /** Repaints per second in tty mode, clamped to 1..30. Default 10. */
  fps?: number;
  /** SGR colors. Default: true in tty mode unless NO_COLOR is set. */
  color?: boolean;
  /** Column override. Default sink.columns, else 80. */
  width?: number;
  /** Body rows before the oldest completed rows collapse. Default 24. */
  maxRows?: number;
  /** Header title. Default: the workflow name from run:start. */
  title?: string;
}

export interface ProgressHandle {
  /** The resolved mode after auto detection. */
  readonly mode: 'tty' | 'lines' | 'off';
  /** Settles after the final frame is written; never rejects. */
  readonly done: Promise<void>;
  /** Force an immediate repaint outside the tick (tests, custom pacing). */
  render(): void;
  /**
   * Idempotent. final=true (default) paints the settle frame; false
   * freezes the current frame in scrollback. Always restores the cursor
   * and resolves `done`.
   */
  stop(final?: boolean): void;
}

export type ProgressSource =
  RunHandle<unknown> | Promise<RunHandle<unknown>> | AsyncIterable<WorkflowEvent>;

/* ------------------------------ formatting ------------------------------ */

function fmtDuration(ms: number): string {
  const s = ms / 1000;
  if (s < 10) return `${s.toFixed(1)}s`;
  if (s < 60) return `${String(Math.floor(s))}s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${String(minutes)}m ${String(Math.floor(s % 60)).padStart(2, '0')}s`;
  return `${String(Math.floor(minutes / 60))}h ${String(minutes % 60).padStart(2, '0')}m`;
}

function fmtTokens(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10_000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1_000_000) return `${String(Math.round(count / 1000))}k`;
  return `${(count / 1_000_000).toFixed(1)}M`;
}

function fmtUsd(amount: number): string {
  if (amount === 0) return '$0';
  if (amount >= 100) return `$${String(Math.round(amount))}`;
  if (amount >= 1) return `$${amount.toFixed(2)}`;
  if (amount >= 0.01) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(4)}`;
}

function bar(spent: number, ceiling: number, cells: number): string {
  const ratio = ceiling <= 0 ? 1 : Math.min(1, spent / ceiling);
  const filled = Math.round(ratio * cells);
  return '#'.repeat(filled) + '.'.repeat(cells - filled);
}

const SPINNER = ['|', '/', '-', '\\'] as const;

/* -------------------------------- state --------------------------------- */

interface RoleSlice {
  role: string;
  startedAt: number;
  endedAt?: number;
}

interface Node {
  spanId: string;
  parentSpanId?: string;
  kind: 'agent' | 'child' | 'phase';
  title: string;
  model?: string;
  status: string;
  replayed: boolean;
  roles: RoleSlice[];
  streamedChars: number;
  usage?: { input: number; output: number };
  costUsd?: number;
  badge?: string;
  toolActive?: string;
  toolCount: number;
  children: string[];
  startedAt: number;
  endedAt?: number;
}

interface State {
  title?: string;
  runId?: string;
  resumed: boolean;
  startedAt?: number;
  endedAt?: number;
  status: string;
  spentUsd: number;
  ceilingUsd?: number;
  totalUsd?: number;
  nodes: Map<string, Node>;
  roots: string[];
  banner?: string;
  notices: string[];
  wakes: number;
  admitted: number;
  rejected: number;
  cost?: CostReport;
  dirty: boolean;
}

function newState(title?: string): State {
  return {
    ...(title === undefined ? {} : { title }),
    resumed: false,
    status: 'running',
    spentUsd: 0,
    nodes: new Map(),
    roots: [],
    notices: [],
    wakes: 0,
    admitted: 0,
    rejected: 0,
    dirty: true,
  };
}

function nodeOf(state: State, event: WorkflowEvent, kind: Node['kind'], title: string): Node {
  const existing = state.nodes.get(event.spanId);
  if (existing !== undefined) {
    return existing;
  }
  const node: Node = {
    spanId: event.spanId,
    ...(event.parentSpanId === undefined ? {} : { parentSpanId: event.parentSpanId }),
    kind,
    title,
    status: 'running',
    replayed: event.replayed === true,
    roles: [],
    streamedChars: 0,
    toolCount: 0,
    children: [],
    startedAt: 0,
  };
  state.nodes.set(event.spanId, node);
  const parent =
    event.parentSpanId === undefined || event.parentSpanId === event.spanId
      ? undefined
      : state.nodes.get(event.parentSpanId);
  if (parent !== undefined) {
    parent.children.push(event.spanId);
  } else {
    // Unknown, absent, or self-referential parent: attach at the root,
    // never reparent later.
    state.roots.push(event.spanId);
  }
  return node;
}

/**
 * Untrusted wire strings (model ids, tool names, error messages) may
 * carry control characters; a raw newline or escape sequence in a frame
 * would break the repaint arithmetic or leak terminal control. One
 * space per control run, SGR added only by paint() afterwards.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]+/gu;

function scrub(text: string): string {
  return text.replace(CONTROL_CHARS, ' ');
}

function agentTitle(event: { agentType?: string; label?: string }): string {
  const base =
    event.agentType === undefined || event.agentType === '' ? 'agent' : scrub(event.agentType);
  return event.label === undefined || event.label === '' ? base : `${base} (${scrub(event.label)})`;
}

/** The tool event's span is the agent's own span or a child of it. */
function toolTarget(state: State, event: WorkflowEvent): Node | undefined {
  return (
    state.nodes.get(event.spanId) ??
    (event.parentSpanId === undefined ? undefined : state.nodes.get(event.parentSpanId))
  );
}

function applyEvent(state: State, event: WorkflowEvent, now: number): void {
  state.dirty = true;
  switch (event.type) {
    case 'run:start': {
      state.runId = event.runId;
      state.resumed = event.resumed === true;
      state.startedAt ??= now;
      state.title ??= scrub(event.workflow);
      break;
    }
    case 'run:end': {
      state.status = event.status;
      state.totalUsd = event.totalUsd;
      state.endedAt = now;
      for (const node of state.nodes.values()) {
        if (node.endedAt === undefined && node.kind !== 'phase') {
          node.endedAt = now;
          if (node.status === 'running' || node.status === 'queued') {
            node.status = 'interrupted';
          }
        }
        const open = node.roles.at(-1);
        if (open !== undefined && open.endedAt === undefined) {
          open.endedAt = now;
        }
      }
      break;
    }
    case 'phase:start': {
      const node = nodeOf(state, event, 'phase', scrub(event.phase));
      node.startedAt = now;
      node.status = 'ok';
      break;
    }
    case 'budget:update': {
      state.spentUsd = event.spentUsd;
      state.ceilingUsd =
        event.remainingUsd === null ? undefined : event.spentUsd + event.remainingUsd;
      break;
    }
    case 'log': {
      if (event.level === 'warn' || event.level === 'error') {
        state.notices.push(scrub(`${event.level}: ${event.msg}`));
        if (state.notices.length > 2) {
          state.notices.shift();
        }
      }
      break;
    }
    case 'external:waiting': {
      state.banner = scrub(`waiting on external: ${event.key}`);
      break;
    }
    case 'approval:pending': {
      state.banner = scrub(`approval pending: ${event.toolName}`);
      break;
    }
    case 'child:start': {
      const node = nodeOf(state, event, 'child', scrub(`${event.workflow} (${event.scope})`));
      node.startedAt = now;
      break;
    }
    case 'child:end': {
      const node = state.nodes.get(event.spanId);
      if (node !== undefined) {
        node.status = event.status;
        node.endedAt = now;
      }
      break;
    }
    case 'agent:queued': {
      const node = nodeOf(state, event, 'agent', agentTitle(event));
      node.status = 'queued';
      node.startedAt = now;
      break;
    }
    case 'agent:start': {
      state.banner = undefined;
      const node = nodeOf(state, event, 'agent', agentTitle(event));
      if (node.status === 'queued' || node.roles.length === 0) {
        node.startedAt = now;
      }
      node.status = 'running';
      node.model = scrub(event.model);
      if (event.replayed === true) {
        node.replayed = true;
      }
      const open = node.roles.at(-1);
      if (open !== undefined && open.endedAt === undefined) {
        // A second start on the same span is an inner phase taking over
        // (summarize, finalize, extract): the prior role freezes.
        open.endedAt = now;
      }
      node.roles.push({ role: event.role, startedAt: now });
      break;
    }
    case 'agent:stream': {
      const node = state.nodes.get(event.spanId);
      if (node !== undefined) {
        node.streamedChars += event.delta.length;
      }
      break;
    }
    case 'agent:error': {
      const node = state.nodes.get(event.spanId);
      if (node !== undefined) {
        node.badge = event.willRetry ? 'retry' : scrub(`error: ${event.error.message}`);
      }
      break;
    }
    case 'agent:schema-retry': {
      const node = state.nodes.get(event.spanId);
      if (node !== undefined) {
        node.badge = `schema ${String(event.attempt)}/${String(event.maxAttempts)}`;
      }
      break;
    }
    case 'agent:end': {
      state.banner = undefined;
      const node = nodeOf(state, event, 'agent', agentTitle(event));
      node.status = event.status;
      node.endedAt = now;
      node.usage = { input: event.usage.inputTokens, output: event.usage.outputTokens };
      node.costUsd = event.costUsd;
      if (event.replayed === true) {
        node.replayed = true;
      }
      if (node.status === 'ok') {
        node.badge = undefined;
      }
      const open = node.roles.at(-1);
      if (open !== undefined && open.endedAt === undefined) {
        open.endedAt = now;
      }
      break;
    }
    case 'tool:start': {
      const node = toolTarget(state, event);
      if (node !== undefined) {
        node.toolActive = scrub(event.toolName);
      }
      break;
    }
    case 'tool:end': {
      const node = toolTarget(state, event);
      if (node !== undefined) {
        node.toolActive = undefined;
        node.toolCount += 1;
        if (event.outcome === 'denied') {
          node.badge = scrub(`tool ${event.toolName} denied`);
        }
      }
      break;
    }
    case 'orchestrator:woke': {
      state.wakes += 1;
      break;
    }
    case 'spawn:admitted': {
      state.admitted += 1;
      break;
    }
    case 'spawn:rejected': {
      state.rejected += 1;
      state.notices.push(`spawn rejected: ${event.code}`);
      if (state.notices.length > 2) {
        state.notices.shift();
      }
      break;
    }
    default:
      // Unknown event types are contractually tolerated.
      break;
  }
}

/* ------------------------------- composing ------------------------------ */

const GLYPHS: Record<string, string> = {
  ok: '*',
  running: '',
  queued: 'o',
  error: 'x',
  cancelled: 'x',
  exhausted: 'x',
  interrupted: 'x',
  escalated: '!',
};

interface Style {
  color: boolean;
}

function paint(text: string, code: string, style: Style): string {
  return style.color ? `[${code}m${text}[0m` : text;
}

function nodeRow(node: Node, now: number, spinner: string, style: Style): string {
  const running = node.endedAt === undefined && node.status === 'running';
  // Replayed rows never spin: their work happened in a previous process.
  const glyph = running ? (node.replayed ? '*' : spinner) : (GLYPHS[node.status] ?? '*');
  const parts: string[] = [glyph === '' ? spinner : glyph, node.title];
  if (node.model !== undefined) {
    parts.push(paint(node.model, '2', style));
  }
  const currentRole = node.roles.at(-1)?.role;
  if (currentRole !== undefined && currentRole !== 'loop') {
    parts.push(paint(`> ${currentRole}`, '36', style));
  }
  if (node.replayed) {
    parts.push(paint('replay', '2', style));
  } else if (node.startedAt > 0 && node.kind !== 'phase') {
    const elapsed = (node.endedAt ?? now) - node.startedAt;
    parts.push(fmtDuration(elapsed));
  }
  if (node.usage !== undefined) {
    parts.push(`in ${fmtTokens(node.usage.input)} out ${fmtTokens(node.usage.output)}`);
  } else if (running && node.streamedChars > 0) {
    parts.push(paint(`~${fmtTokens(Math.ceil(node.streamedChars / 4))} out`, '2', style));
  }
  if (node.costUsd !== undefined && !node.replayed) {
    parts.push(fmtUsd(node.costUsd));
  }
  if (node.toolActive !== undefined) {
    parts.push(paint(`tool: ${node.toolActive}`, '33', style));
  } else if (node.toolCount > 0) {
    parts.push(
      paint(`${String(node.toolCount)} tool${node.toolCount === 1 ? '' : 's'}`, '2', style),
    );
  }
  if (node.badge !== undefined) {
    parts.push(paint(node.badge, node.badge.startsWith('error') ? '31' : '33', style));
  }
  if (node.status === 'queued') {
    parts.push(paint('queued', '2', style));
  }
  return parts.join('  ');
}

function roleRow(node: Node, now: number): string | undefined {
  if (node.roles.length < 2) {
    return undefined;
  }
  const spans = node.roles.map((slice) => {
    const elapsed = (slice.endedAt ?? now) - slice.startedAt;
    return `${slice.role} ${fmtDuration(elapsed)}${slice.endedAt === undefined ? '..' : ''}`;
  });
  return `roles: ${spans.join(' · ')}`;
}

function composeTree(state: State, now: number, spinner: string, style: Style): string[] {
  const lines: string[] = [];
  const visited = new Set<string>();
  const walk = (spanId: string, depth: number): void => {
    const node = state.nodes.get(spanId);
    if (node === undefined || visited.has(spanId)) {
      return;
    }
    visited.add(spanId);
    const indent = '  '.repeat(depth + 1);
    if (node.kind === 'phase') {
      lines.push(`${indent}${paint(`[${node.title}]`, '1', style)}`);
    } else {
      lines.push(indent + nodeRow(node, now, spinner, style));
      const roles = roleRow(node, now);
      if (roles !== undefined) {
        lines.push(indent + '  ' + paint(roles, '2', style));
      }
    }
    for (const child of node.children) {
      walk(child, depth + 1);
    }
  };
  for (const root of state.roots) {
    walk(root, 0);
  }
  return lines;
}

function composeFrame(
  state: State,
  now: number,
  tick: number,
  style: Style,
  width: number,
  maxRows: number,
  maxHeight?: number,
): string[] {
  const spinner = SPINNER[tick % SPINNER.length] as string;
  const lines: string[] = [];
  const running = state.endedAt === undefined;
  const headGlyph = running ? spinner : state.status === 'ok' ? '*' : 'x';
  const head: string[] = [headGlyph, state.title ?? 'run'];
  if (state.runId !== undefined) {
    head.push(paint(`run ${state.runId}`, '2', style));
  }
  if (state.resumed) {
    head.push(paint('(resumed)', '2', style));
  }
  if (state.startedAt !== undefined) {
    head.push(fmtDuration((state.endedAt ?? now) - state.startedAt));
  }
  const spent = state.totalUsd ?? state.spentUsd;
  if (state.ceilingUsd !== undefined) {
    head.push(`${fmtUsd(spent)} / ${fmtUsd(state.ceilingUsd)}`);
    head.push(bar(spent, state.ceilingUsd, 12));
  } else if (spent > 0) {
    head.push(fmtUsd(spent));
  }
  lines.push(head.join('  '));

  let body = composeTree(state, now, spinner, style);
  if (body.length > maxRows) {
    const hidden = body.length - maxRows;
    body = [
      paint(`  ... ${String(hidden)} earlier rows hidden`, '2', style),
      ...body.slice(hidden),
    ];
  }
  lines.push(...body);

  if (state.wakes + state.admitted + state.rejected > 0) {
    lines.push(
      '  ' +
        paint(
          `orch: wakes ${String(state.wakes)} · spawns ${String(state.admitted)} admitted, ` +
            `${String(state.rejected)} rejected`,
          '2',
          style,
        ),
    );
  }
  if (state.banner !== undefined && running) {
    lines.push('  ' + paint(state.banner, '33', style));
  }
  for (const notice of state.notices) {
    lines.push('  ' + paint(notice, '33', style));
  }

  if (!running) {
    const roleCosts = state.cost?.byRole;
    if (roleCosts !== undefined) {
      const nonzero = Object.entries(roleCosts).filter(([, value]) => value > 0);
      if (nonzero.length > 0) {
        lines.push('  ' + nonzero.map(([role, value]) => `${role} ${fmtUsd(value)}`).join(' · '));
      }
    }
    lines.push(
      `${state.status === 'ok' ? '*' : 'x'} ${state.status}` +
        (state.totalUsd === undefined ? '' : `  total ${fmtUsd(state.totalUsd)}`),
    );
  }

  // Hard TOTAL-HEIGHT clamp: a frame taller than the terminal would
  // scroll the top out of reach and break the cursor-up repaint. Keep
  // the header and, at settle, the summary tail; drop the middle behind
  // a marker. Only engaged when the sink reports its height.
  let clamped = lines;
  if (maxHeight !== undefined && lines.length > maxHeight && maxHeight >= 3) {
    const keepTail = Math.min(running ? 1 : 3, maxHeight - 2);
    const hidden = lines.length - 1 - keepTail - 1;
    clamped = [
      lines[0] ?? '',
      paint(`  ... ${String(hidden)} lines hidden (terminal too short)`, '2', style),
      ...lines.slice(lines.length - keepTail),
    ];
  }

  // Hard width clip; styled lines fall back to their plain form when long.
  return clamped.map((line) => {
    // eslint-disable-next-line no-control-regex
    const plain = line.replace(/\[[0-9;]*m/gu, '');
    if (plain.length <= width - 1) {
      return line;
    }
    // Clipped total stays strictly under the terminal width so a row
    // can never hard-wrap and break the cursor-up repaint arithmetic.
    return plain.slice(0, Math.max(0, width - 4)) + '...';
  });
}

/* -------------------------------- attach -------------------------------- */

function defaultSink(): ProgressSink {
  return process.stderr;
}

function defaultClock(): ProgressClock {
  return {
    // performance.now(), not Date.now(): the view only ever computes
    // DIFFERENCES, a monotonic origin is strictly better for timers,
    // and the renderer's callbacks execute inside the run's async
    // context, where a bare Date.now() would (correctly) trip the
    // determinism detector even though telemetry never enters the
    // journal.
    now: () => performance.now(),
    every: (ms, fn) => {
      const timer = setInterval(fn, ms);
      return () => clearInterval(timer);
    },
  };
}

function resolveMode(
  option: ProgressMode | undefined,
  sink: ProgressSink,
): 'tty' | 'lines' | 'off' {
  if (option !== undefined && option !== 'auto') {
    return option;
  }
  const dumb = process.env.TERM === 'dumb' || process.env.CI !== undefined;
  return sink.isTTY === true && !dumb ? 'tty' : 'lines';
}

function isHandle(source: ProgressSource): source is RunHandle<unknown> {
  return (
    typeof (source as RunHandle<unknown>).on === 'function' &&
    typeof (source as RunHandle<unknown>).result?.then === 'function'
  );
}

/** Every event type the reducer renders; handle mode subscribes per type. */
const CONSUMED_TYPES = [
  'run:start',
  'run:end',
  'phase:start',
  'budget:update',
  'log',
  'external:waiting',
  'approval:pending',
  'child:start',
  'child:end',
  'agent:queued',
  'agent:start',
  'agent:stream',
  'agent:error',
  'agent:schema-retry',
  'agent:end',
  'tool:start',
  'tool:end',
  'orchestrator:woke',
  'spawn:admitted',
  'spawn:rejected',
] as const;

/**
 * Attaches a live progress view to a run and returns its handle. Accepts
 * a RunHandle (subscribes through `on()`, leaving `handle.events` free
 * for the host, and enriches the final frame from `RunOutcome.cost`;
 * `orchestrate` returns exactly such a handle, so
 * `progress(orchestrate(...))` composes directly), a promise resolving
 * to a handle (for wrappers that construct one asynchronously), or a
 * raw WorkflowEvent iterable (the gapless path for resumes:
 * `progress(resumed.events)`; note it consumes that one-shot iterable).
 * The view auto-stops when the run settles.
 */
export function progress(source: ProgressSource, options?: ProgressOptions): ProgressHandle {
  const sink = options?.sink ?? defaultSink();
  const clock = options?.clock ?? defaultClock();
  const mode = resolveMode(options?.mode, sink);
  const style: Style = {
    color: options?.color ?? (mode === 'tty' && process.env.NO_COLOR === undefined),
  };
  const width = options?.width ?? sink.columns ?? 80;
  const maxRows = options?.maxRows ?? Math.max(6, Math.min(24, (sink.rows ?? 32) - 8));
  const fps = Math.min(30, Math.max(1, options?.fps ?? 10));
  const state = newState(options?.title);

  let settled = false;
  let resolveDone = (): void => undefined;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  if (mode === 'off') {
    if (!isHandle(source) && typeof (source as Promise<RunHandle<unknown>>).then === 'function') {
      // Even a disabled view must not orphan a promise source.
      void (source as Promise<RunHandle<unknown>>).catch(() => undefined);
    }
    settled = true;
    resolveDone();
    return { mode, done, render: () => undefined, stop: () => undefined };
  }

  let tick = 0;
  let paintedLines = 0;
  let lastLinesBudgetAt: number | undefined;

  const paintFrame = (): void => {
    // Re-read the height each paint so a resize between frames is
    // honored; leave one line for the cursor.
    const maxHeight = sink.rows === undefined ? undefined : Math.max(3, sink.rows - 1);
    const frame = composeFrame(state, clock.now(), tick, style, width, maxRows, maxHeight);
    const erase = paintedLines > 0 ? `[${String(paintedLines)}A[0J` : '';
    sink.write(erase + frame.join('\n') + '\n');
    paintedLines = frame.length;
    state.dirty = false;
  };

  const lineFor = (event: WorkflowEvent, now: number): string | undefined => {
    switch (event.type) {
      case 'run:start':
        return `run ${event.runId} started: ${event.workflow}${event.resumed ? ' (resumed)' : ''}`;
      case 'phase:start':
        return `phase: ${event.phase}`;
      case 'agent:start': {
        const node = state.nodes.get(event.spanId);
        const inner = node !== undefined && node.roles.length > 1;
        return `agent ${agentTitle(event)} -> ${event.model} (${event.role})${inner ? ' [inner phase]' : ''}`;
      }
      case 'agent:end': {
        const node = state.nodes.get(event.spanId);
        const elapsed =
          node === undefined || node.replayed || node.startedAt <= 0
            ? ''
            : ` in ${fmtDuration((node.endedAt ?? now) - node.startedAt)}`;
        const roles =
          node !== undefined && node.roles.length > 1
            ? ` [${node.roles.map((slice) => slice.role).join(' > ')}]`
            : '';
        return (
          `agent ${agentTitle(event)} ${event.status}${elapsed}: ` +
          `in ${fmtTokens(event.usage.inputTokens)} out ${fmtTokens(event.usage.outputTokens)}, ` +
          `${fmtUsd(event.costUsd)}${roles}${event.replayed === true ? ' (replay)' : ''}`
        );
      }
      case 'agent:error':
        return (
          `agent ${agentTitle(event)} error: ${event.error.message}` +
          (event.willRetry ? ' (will retry)' : '')
        );
      case 'budget:update': {
        if (lastLinesBudgetAt !== undefined && now - lastLinesBudgetAt < 1000) {
          return undefined;
        }
        lastLinesBudgetAt = now;
        return (
          `budget: ${fmtUsd(event.spentUsd)}` +
          (event.remainingUsd === null ? '' : ` of ${fmtUsd(event.spentUsd + event.remainingUsd)}`)
        );
      }
      case 'log':
        return event.level === 'warn' || event.level === 'error'
          ? `[${event.level}] ${event.msg}`
          : undefined;
      case 'external:waiting':
        return `waiting on external: ${event.key}`;
      case 'approval:pending':
        return `approval pending: ${event.toolName}`;
      case 'run:end':
        return `run finished: ${event.status} (total ${fmtUsd(event.totalUsd)})`;
      default:
        return undefined;
    }
  };

  const onEvent = (event: WorkflowEvent): void => {
    const now = clock.now();
    applyEvent(state, event, now);
    if (mode === 'lines') {
      const line = lineFor(event, now);
      if (line !== undefined) {
        sink.write(line + '\n');
      }
    }
  };

  const finishLines = (): void => {
    const roleCosts = state.cost?.byRole;
    if (roleCosts === undefined) {
      return;
    }
    const nonzero = Object.entries(roleCosts).filter(([, value]) => value > 0);
    if (nonzero.length > 0) {
      sink.write(`cost by role: ${nonzero.map(([r, v]) => `${r} ${fmtUsd(v)}`).join(', ')}\n`);
    }
  };

  let cancelTick: (() => void) | undefined;
  let unsubscribe: Array<() => unknown> = [];

  const handleApi: ProgressHandle = {
    mode,
    done,
    render: () => {
      if (!settled && mode === 'tty') {
        tick += 1;
        paintFrame();
      }
    },
    stop: (final = true) => {
      if (settled) {
        return;
      }
      settled = true;
      cancelTick?.();
      for (const off of unsubscribe) {
        off();
      }
      unsubscribe = [];
      if (mode === 'tty') {
        if (final) {
          paintFrame();
        }
        sink.write('[?25h');
      } else if (final) {
        finishLines();
      }
      resolveDone();
    },
  };

  if (mode === 'tty') {
    sink.write('[?25l');
    cancelTick = clock.every(Math.round(1000 / fps), () => {
      if (settled) {
        return;
      }
      tick += 1;
      const anyRunning = state.endedAt === undefined;
      if (state.dirty || anyRunning) {
        paintFrame();
      }
    });
  }

  const attachHandle = (handle: RunHandle<unknown>): void => {
    if (settled) {
      void handle.result.catch(() => undefined);
      return;
    }
    for (const type of CONSUMED_TYPES) {
      unsubscribe.push(handle.on(type, onEvent));
    }
    handle.result
      .then((outcome) => {
        state.cost = outcome.cost;
        state.status = outcome.status;
        state.totalUsd = outcome.cost.totalUsd;
        state.endedAt ??= clock.now();
      })
      .catch((thrown: unknown) => {
        state.notices.push(`error: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
        state.endedAt ??= clock.now();
      })
      .finally(() => {
        handleApi.stop(true);
      });
  };

  if (isHandle(source)) {
    attachHandle(source);
  } else if (typeof (source as Promise<RunHandle<unknown>>).then === 'function') {
    void (source as Promise<RunHandle<unknown>>)
      .then((handle) => {
        attachHandle(handle);
      })
      .catch((thrown: unknown) => {
        state.notices.push(`error: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
        state.endedAt ??= clock.now();
        handleApi.stop(true);
      });
  } else {
    void (async () => {
      try {
        for await (const event of source as AsyncIterable<WorkflowEvent>) {
          if (settled) {
            break;
          }
          onEvent(event);
        }
      } catch (thrown) {
        state.notices.push(`error: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
      } finally {
        state.endedAt ??= clock.now();
        handleApi.stop(true);
      }
    })();
  }

  return handleApi;
}
