---
'@lurker/core': minor
---

M3-T01 tool system core plus the M3 entry-gate docs amendment. `tool()`
definitions over the three SchemaSpec forms with definition-time
validation (name pattern, schema projection, recursive/remote ref
rejection); the ToolSource SPI seam types (ToolDef, ToolRisk, ToolContext,
ToolSourceSession); per-spawn toolset resolution with duplicate-name and
executor fail-early ConfigErrors; toolsetHash derived from contracts only
(editing an execute body never re-keys a journal, bumping `version` does)
and wired into spawn identity; agent-loop tool dispatch with argument
validation, bounded ModelRetry conversion, NonSerializableValueError
surfacing, maxToolCalls expiry as terminal `limit`, and tool:start /
tool:end telemetry. The docs/06 Appendix A knob "no-progress detector N"
is committed at 3 consecutive turns without tool calls or artifact deltas
(consumed by M3-T08).
