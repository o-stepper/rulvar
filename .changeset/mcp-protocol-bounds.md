---
'@rulvar/core': minor
---

Bound the MCP import surface: the tools/list sweep, per-tool schema bytes, and per-source timeouts (RV1515, the P1 tail).

An MCP server sits across a trust boundary, and three of its behaviors were unbounded on the host side. `mcp()` now takes three opt-in bounds: `maxTools` caps the tools/list sweep itself (checked after each page against the accumulated WIRE tools, pre-filter, so a hostile server cannot stream past it and an allow list cannot admit past it), `maxSchemaBytes` caps each admitted tool's serialized inputSchema plus outputSchema (the allow/deny filter runs first, so a denied tool's schema bomb costs nothing), and `timeouts` bounds the latencies: `connectMs` races the handshake and releases the client (and a stdio child) on expiry with a typed refusal, while `listMs` and `callMs` ride the SDK request timeout per page and per call, tightening the SDK's own 60s default; a call timeout surfaces as that tool's error result and never propagates past policy. Every bound refuses typed with the measured value and the declared cap in the message; absent bounds preserve the previous behavior byte for byte.
