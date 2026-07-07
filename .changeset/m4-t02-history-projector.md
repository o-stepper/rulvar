---
'@lurker/core': minor
'@lurker/anthropic': minor
'@lurker/openai': minor
---

M4-T02 HistoryProjector. Cross-provider history projection lands in
`@lurker/core` (`model/projector.ts`) and the retention pipeline that
feeds it:

- `projectHistory` projects the canonical history into a target
  provider's view: provider-raw parts ride if and only if the target
  adapter's provider family matches the part's provider; everything
  else passes through untouched. The agent loop projects EVERY outgoing
  request (loop turns, finalize, extract), so per-role provider mixing
  inside one agent yields a valid wire history on each side.
- Retention transport: adapters ship a turn's blocks-to-retain in
  stream order via `finish.providerMetadata[<adapter id>].retainedParts`;
  the runtime lifts them into provider-raw parts at the HEAD of the
  turn's canonical assistant message. `@lurker/anthropic` ships thinking
  and redacted_thinking blocks (signatures intact, pause_turn
  continuations included); `@lurker/openai` ships reasoning items with
  their encrypted_content. Retained blocks now actually reach the
  canonical history, survive checkpoints, and echo byte-exact to their
  own provider on every subsequent turn.
- `ProviderAdapter` gains an optional `provider` field: the provider
  family for provider-raw matching (default = adapter id). The
  first-class adapters declare 'anthropic' and 'openai';
  `openaiCompatible` gateways declare 'openai' whatever their custom id,
  so same-family adapters share retained blocks and projections.

Identity is untouched: projection state never enters content keys, and
adapters that ship no retention payload (FakeAdapter included) produce
byte-identical histories.
