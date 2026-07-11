/**
 * ScriptRunner SPI marker (one of the six seams frozen at 1.0).
 *
 * The interface declaration lives with the runner implementations in
 * src/runner/inprocess.ts because its signature is written in terms of
 * Workflow and Ctx: the docs/02 L0 listing records the seam's frozen
 * status, and the frozen surface is tracked through the rolled-up .d.ts
 * like every seam. WorkerSandboxRunner and compileScript ship in
 * @rulvar/planner (M6).
 *
 * Owning spec: docs/06-execution-spec.md, section "Script runners".
 */
export {};
