---
'@lurker/core': minor
'@lurker/anthropic': minor
'@lurker/openai': minor
'@lurker/testing': minor
---

M4-T01 role protocol completion. The full trigger protocol for the six
invocation roles lands in `@lurker/core` (`model/roles.ts`):

- Extract necessity is completed per docs/04 section 8.3: a separate
  final structured-output invocation fires when a schema is set AND
  (routing directs extract to a different model OR the loop model's
  required tier cannot ride a tools-available turn OR finalize is
  routed). The required-tier rule is new: a `forced-tool` tier pins
  toolChoice to `emit_result` and cannot ride while the agent's tools
  must remain available, so such agents now pay one separate extract
  call instead of silently losing tool access. Agents without tools
  keep the M1 single-shot behavior byte for byte.
- The finalize role fires for the first time: only when configured in
  routing and only for tool-bearing agents, as one synthesis invocation
  with toolChoice `'none'` over the full transcript after tools stop.
  Its text is the output for schema-less calls; with a schema the
  separate extract runs over the transcript including the synthesis.
- A separate extract invocation over a tool-bearing transcript now
  carries the agent's tool contracts (both providers reject tool-use
  history without tool definitions) with toolChoice pinned to `'none'`
  or to `emit_result` per tier.
- Both adapters map `toolChoice: 'none'` to the provider's explicit
  none choice with the tools param present instead of dropping tools
  from the request.
- `createTestEngine` no longer routes `finalize` by default: the
  routing key is the firing opt-in, and the old default would have
  summoned a synthesis call for every tool-bearing test agent. Tests
  that want finalize route it explicitly.

Identity is untouched: extract and finalize resolutions never enter
the spawn content key, and existing journals replay unchanged.
