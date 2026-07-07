import { InvocationRole, ModelSpec, WorkflowEvent } from "@lurker/core";
import { ANTHROPIC_MODELS, AnthropicAdapterOptions, anthropic } from "@lurker/anthropic";
import { OPENAI_MODELS, OpenAiAdapterOptions, openai } from "@lurker/openai";
export * from "@lurker/core";

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
//#region src/defaults.d.ts
/**
* Drop-in engine defaults: `createEngine({ ..., defaults: { routing:
* recommendedDefaults.routing } })`. Hosts override freely; these are
* data, not engine semantics.
*/
declare const recommendedDefaults: {
  routing: Partial<Record<InvocationRole, ModelSpec>>;
};
//#endregion
export { ANTHROPIC_MODELS, type AnthropicAdapterOptions, OPENAI_MODELS, type OpenAiAdapterOptions, type RenderProgressOptions, anthropic, openai, recommendedDefaults, renderProgress };