---
'@lurker/core': minor
'@lurker/cli': minor
'@lurker/lurker': minor
---

M5-T01 workflow registry and the @lurker/cli base.

- `@lurker/core` gains the per-engine `WorkflowRegistry` type and
  `defaults.workflows` on createEngine (docs/06 section 10.4): an
  explicit first-class value, no module-level registry; shells resolve
  by-name runs against it (ctx.workflow's string form arrives M6, the
  queue worker M8).
- Spec-conformance fix: the M4-T09 quality floors option moves from the
  createEngine top level to its canonical home `defaults.roleFloors`
  (docs/06 section 10.1). Update `createEngine({ floors })` call sites
  to `createEngine({ defaults: { roleFloors } })`.
- `@lurker/cli` ships its first real surface: the canonical grammar
  `lurker run <file|name> [--args JSON] [--store PATH] [--budget-usd N]`,
  `lurker resume <runId> [--args JSON] [--store PATH]`,
  `lurker runs ls [--store PATH]`, `lurker inspect <runId> [--store
  PATH]` (no aliases), a line-oriented TUI progress renderer over the
  event stream, and interactive resolution of suspended approvals and
  externals (EOF leaves the run suspended, never errors). Engine
  assembly follows the host-config convention: `lurker.config.mjs`
  default-exports `{ engineOptions?, workflows? }`, a workflow module
  may export `workflow`/`engineOptions`/`workflows`, and --store selects
  the JsonlFileStore directory (default `.lurker`), so the CLI itself
  depends only on @lurker/core. The `lurker` bin is included; the
  resume/inspect grammar amendment (--args re-supply, --store symmetry)
  is recorded in docs/06 section 10.5.
