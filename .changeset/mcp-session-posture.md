---
'@rulvar/core': minor
---

Name the MCP session posture: per-request auth refresh and the drift policy (RV1516, the P1 tail).

The auth story and the drift story of an `mcp()` source get host-owned contracts. `http.headers` (streamable-http only, forbidden typed elsewhere) injects headers into every wire request through a wrapped fetch; the hook form is awaited before each send, which makes it the refresh point for rotating tokens, with no reconnect and no library-invented 401 retry. `drift` names what a listChanged notification means: `'rekey'` is the documented default (the changed list re-keys subsequently spawned agents), and `'refuse'` fails closed: the notification poisons the source, every later `tools()` refuses typed, and only `close()` clears it, so importing a changed list is always a deliberate host action. In-flight spawn snapshots are untouched either way, and the two refusal layers compose with the toolset attestation: refuse at the source vs refuse at the spawn.
