---
'@lurker/core': minor
---

M3-T04 MCP ToolSource. `mcp(cfg)` imports Model Context Protocol tools
over stdio, streamable-http, or an in-process server instance (pinned
SDK line @modelcontextprotocol/sdk ^1.29; the v2 migration is the
logged post-M3 task M5-T10). tools/list is fetched with cursor
pagination until exhaustion and cached per session; a listChanged
notification invalidates the cache for subsequently spawned agents only
(a spawn's toolset snapshot stays immutable). allow/deny filters apply
to pre-prefix names with deny winning; `prefix` namespaces collisions;
`approval` maps to needsApproval per tool; host-supplied `risk` labels
feed the permission presets. inputSchema becomes bare-JSON-Schema
parameters (form 3); outputSchema validates structuredContent;
isError maps to an error tool result surfaced to the model, never a
protocol error; MCP tools hash version as absent, so provider-side
contract drift re-keys new spawns by design.
