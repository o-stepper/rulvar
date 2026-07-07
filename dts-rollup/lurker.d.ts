import { InvocationRole, ModelSpec, QualityFloors, WorkflowEvent } from "@lurker/core";
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
* recommendedDefaults.routing }, floors: recommendedDefaults.floors })`.
* Hosts override freely; these are data, not engine semantics. The
* floors pin orchestrate and plan to strong models as hard router
* constraints (docs/04, section "Role quality floors"; M4-T09): weak
* model defaults are forbidden for plan and orchestrate work, and no
* advice may override or weaken a floor.
*/
declare const recommendedDefaults: {
  routing: Partial<Record<InvocationRole, ModelSpec>>;
  floors: QualityFloors;
};
//#endregion
export { ANTHROPIC_MODELS, type AnthropicAdapterOptions, OPENAI_MODELS, type OpenAiAdapterOptions, type RenderProgressOptions, anthropic, openai, recommendedDefaults, renderProgress };