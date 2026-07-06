import { WorkflowEvent } from "@lurker/core";
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
export { type RenderProgressOptions, renderProgress };