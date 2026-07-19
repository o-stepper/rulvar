import { InvocationRole, ModelSpec, QualityFloors, RunHandle, WorkflowEvent } from "@rulvar/core";
import { ANTHROPIC_MODELS, AnthropicAdapterOptions, anthropic } from "@rulvar/anthropic";
import { OPENAI_MODELS, OpenAiAdapterOptions, openai } from "@rulvar/openai";
export * from "@rulvar/core";

//#region src/render-progress.d.ts
interface RenderProgressOptions {
  /** Line sink; defaults to process.stderr. */
  write?: (line: string) => void;
  /** Include log events (default true; debug level is always skipped). */
  logs?: boolean;
}
/**
* Renders events until the stream ends (the run settled). Returns after
* the final run:end line.
*/
declare function renderProgress(events: AsyncIterable<WorkflowEvent>, options?: RenderProgressOptions): Promise<void>;
//#endregion
//#region src/live-progress.d.ts
/** Raw output sink; chunks may contain ANSI and partial lines. */
interface ProgressSink {
  write(chunk: string): void;
  isTTY?: boolean;
  columns?: number;
  rows?: number;
}
/** Injectable time source; every() returns a cancel function. */
interface ProgressClock {
  now(): number;
  every(ms: number, fn: () => void): () => void;
}
type ProgressMode = "auto" | "tty" | "lines" | "off";
interface ProgressOptions {
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
interface ProgressHandle {
  /** The resolved mode after auto detection. */
  readonly mode: "tty" | "lines" | "off";
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
type ProgressSource = RunHandle<unknown> | Promise<RunHandle<unknown>> | AsyncIterable<WorkflowEvent>;
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
declare function progress(source: ProgressSource, options?: ProgressOptions): ProgressHandle;
//#endregion
//#region src/defaults.d.ts
/**
* Drop-in engine defaults: `createEngine({ ..., defaults: { routing:
* recommendedDefaults.routing, roleFloors: recommendedDefaults.floors } })`.
* Hosts override freely; these are data, not engine semantics. The
* floors pin orchestrate and plan to strong models as hard router
* constraints (M4-T09): weak
* model defaults are forbidden for plan and orchestrate work, and no
* advice may override or weaken a floor.
*/
declare const recommendedDefaults: {
  routing: Partial<Record<InvocationRole, ModelSpec>>;
  floors: QualityFloors;
};
//#endregion
export { ANTHROPIC_MODELS, type AnthropicAdapterOptions, OPENAI_MODELS, type OpenAiAdapterOptions, type ProgressClock, type ProgressHandle, type ProgressMode, type ProgressOptions, type ProgressSink, type ProgressSource, type RenderProgressOptions, anthropic, openai, progress, recommendedDefaults, renderProgress };