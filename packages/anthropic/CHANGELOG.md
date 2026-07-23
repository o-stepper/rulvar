# @rulvar/anthropic

## 1.51.0

### Patch Changes

- @rulvar/core@1.51.0

## 1.50.0

### Patch Changes

- Updated dependencies [e39a885]
  - @rulvar/core@1.50.0

## 1.49.0

### Patch Changes

- Updated dependencies [bab7b2c]
  - @rulvar/core@1.49.0

## 1.48.0

### Patch Changes

- @rulvar/core@1.48.0

## 1.47.0

### Patch Changes

- Updated dependencies [a3687fe]
  - @rulvar/core@1.47.0

## 1.46.0

### Patch Changes

- Updated dependencies [865e7bf]
  - @rulvar/core@1.46.0

## 1.45.0

### Patch Changes

- Updated dependencies [b96305d]
  - @rulvar/core@1.45.0

## 1.44.1

### Patch Changes

- @rulvar/core@1.44.1

## 1.44.0

### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0

## 1.43.0

### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

## 1.42.0

### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

## 1.41.0

### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

## 1.40.0

### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

## 1.39.0

### Patch Changes

- @rulvar/core@1.39.0

## 1.38.0

### Patch Changes

- @rulvar/core@1.38.0

## 1.37.0

### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

## 1.36.0

### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

## 1.35.0

### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

## 1.34.0

### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

## 1.33.0

### Patch Changes

- @rulvar/core@1.33.0

## 1.32.0

### Patch Changes

- @rulvar/core@1.32.0

## 1.31.0

### Patch Changes

- df6b8f8: `Retry-After` accepts HTTP optional whitespace padding only. ECMAScript `trim()` removed far more than the OWS production (space and horizontal tab), so values padded with newline, carriage return, vertical tab, form feed, or NBSP were honored as delays despite the documented exact delta seconds grammar; a real HTTP transport rejects most of those octets, but an injected SDK client or a mock does not. Both first party adapters now match `/^[\t ]*([0-9]+)[\t ]*$/` and fall back to the computed policy backoff for every other form.
  - @rulvar/core@1.31.0

## 1.30.0

### Patch Changes

- 87ce985: Parse `Retry-After` under the exact RFC delta seconds grammar (v1.29.0 review P3). Published 1.29.0 used `Number(header)`, which accepted far more than the documented delta seconds form: an empty or whitespace header became a 0 ms delay (an instant retry instead of the policy backoff), and hex (`0x10`), exponent (`1e3`), decimal (`1.5`), and signed (`+3`) forms were honored as delays. The value must now be a nonempty run of decimal digits after optional whitespace; every other form (the HTTP date included) omits `retryAfterMs` so the engine's computed backoff applies, and a huge digit run still clamps to the Node timer maximum.
- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

## 1.29.0

### Minor Changes

- 621d566: Make the retry and failover backoff interruptible and validate every provider supplied retry delay (v1.28.0 review P1 and P2).

  The retry engine now races its backoff wait against the host cancel signal (which the run deadline also drives) and the budget ceiling signal: an abort wakes the wait immediately, settles through the canonical aborted outcome (`cancelled` or `exhausted`, with every already recorded usage kept), and forbids every further dispatch, including the one behind a keyed limiter queue, so an adapter that ignores its signal can no longer be re entered after an abort. Previously a provider supplied `retryAfterMs` armed an uninterruptible sleep: a cancel, a crossed deadline, and a crossed budget ceiling all waited out the full backoff and the adapter was dispatched again. The injected `retry.sleep(ms)` test hook keeps its signature; a hook that loses the race is abandoned without an unhandled rejection, and the native timer path clears its timer so an abandoned long backoff never pins the event loop.

  `retryDelayMs` is now the defensive boundary the docs promise: only a finite nonnegative provider `retryAfterMs` replaces the computed delay, anything else (NaN, Infinity, a negative) is ignored as adapter noise, and every returned delay is a finite nonnegative integer clamped to the Node timer maximum, so a malformed or huge value can never arm an instant or overflowing timer. Both first party adapters stop emitting unvalidated `Retry-After` parses: an unparsable header (the HTTP date form included) omits `retryAfterMs` entirely instead of producing NaN (which also broke the `WireError.data` Json invariant by serializing to null), and a huge but finite value is clamped. The `mapAnthropicStream` TSDoc now states precisely how a truncated stream is reported (the `finished` flag on the return value, with the adapter synthesizing the terminal error).

  Four frozen fixture cassettes are refrozen for this release (the hashVersion-bump refreeze ceremony applies; hashVersion itself is unchanged and existing journals replay identically): in three cap freeze scenarios the main orchestrator entry now honestly settles cancelled at the cap instead of paying one more ordinary turn whose result the forced finish machinery discarded anyway, and one scenario loses a post abort wait suspension that can no longer be dispatched. Entry identities, keys, and every other row are byte identical.

### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

## 1.28.0

### Minor Changes

- d98eb0b: Enforce the terminal stream contract end to end (v1.27.0 deep E2E review P1 and P2). The runtime now fails closed when an adapter stream drains without a terminal `finish` or `error` event: the partial turn becomes a retryable transport fault that feeds the ordinary retry and failover machinery instead of settling as `ok` with truncated text, and a requested abort (cancel, budget ceiling, idle severance) remains a clean end with no fabricated provider error. Consumption stops at the first terminal event, so events after `finish` can no longer mutate the value, revise the authoritative bill, or trigger tool execution. The first party adapters enforce the same contract at the wire: the Chat Completions mapper no longer synthesizes `finish: stop` when the stream is cut before a `finish_reason` (usage the provider did report is still forwarded, half assembled tool calls are dropped), the Responses mapper fails closed on EOF without a response terminal event, and the Anthropic adapter surfaces a read cut before `message_stop` as a retryable transport error and no longer converts a caller requested abort during `messages.create()` into a terminal error. `mapResponsesStream` and `mapChatCompletionsStream` accept an optional `signal` so a requested abort keeps ending the stream without a terminal event. The VCR `record` wrapper now commits its cassette row even when the consumer stops reading at the terminal event (the engine always does now); adapter middleware must not rely on being drained past the terminal. The committed `combined-loop-descent` catalog cassette is refrozen because stopping consumption at the terminal shifts the deterministic interleaving of two parallel plan children by one scheduler turn; entry content, keys, and the actual `hashVersion` are unchanged, journals recorded under earlier versions replay unchanged, and this changeset carries the frozen fixture gate's hashVersion-bump ceremony token only to unlock that refreeze.

### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

## 1.27.0

### Minor Changes

- 884a433: Types referenced by public signatures are now exported from their package barrels, so the API docs resolve them instead of carrying known incomplete references (v1.26.0 deep E2E review): `BaseAppend` from `@rulvar/core` (the fields common to every `Replayer` append), `Block` and `MappedStop` from `@rulvar/anthropic` (the wire level content block alias and the stop reason mapping), and `VcrHeader` from `@rulvar/testing` (the first line of every cassette file). The frozen TypeDoc baseline shrinks from eleven entries to the four vendored Standard Schema notices.

### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

## 1.26.0

### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

## 1.25.0

### Patch Changes

- @rulvar/core@1.25.0

## 1.24.1

### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

## 1.24.0

### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

## 1.23.0

### Patch Changes

- 1f9c272: The `anthropic()` TSDoc no longer describes the SDK's ambient credentials as a precedence chain (v1.22.0 review P3-2). `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` are independent credentials: requests carry `x-api-key` for the key, bearer `Authorization` for the token, and BOTH headers when both are set; the config-file token-provider chain is consulted only when apiKey and authToken are both null. The providers guide already said exactly this; the source doc (and the generated API page built from it) had drifted.
- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

## 1.22.0

### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

## 1.21.0

### Patch Changes

- 7ee42a0: Declare `usageSemantics: 'anthropic-cache-additive-v1'` on the adapter: the additive reading it has always normalized under (the Anthropic wire genuinely excludes cache reads and writes from `input_tokens`, so canonical `inputTokens` is the sum of all three) now rides usage-bearing journal entries as an auditable policy stamp (v1.20.0 review P1/P2-2).
- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

## 1.20.0

### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

## 1.19.0

### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

## 1.18.0

### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

## 1.17.0

### Patch Changes

- @rulvar/core@1.17.0

## 1.16.2

### Patch Changes

- 9f07130: Correct five stale rows in the seed capability table: Claude Opus 4.8, Opus 4.7, Opus 4.6, Sonnet 5, and Sonnet 4.6 all carry a 1M context window and 128k max output, verified against the official models table and live `GET /v1/models` on 2026-07-17. Default routing, the compaction threshold, and the wire `max_tokens` clamp no longer under-provision runs that never call `refreshCaps()` (Sonnet 5 was clamped to 64k output for no reason). Every row is now pinned by a committed `caps-snapshot.json`: an offline test fails when the table and the snapshot disagree, and the weekly live contract workflow audits the snapshot against the model list so provider-side drift pages instead of rotting. Pricing rows are untouched.
  - @rulvar/core@1.16.2

## 1.16.1

### Patch Changes

- fac1ecc: Treat explicit `apiKey: null`/`authToken: null` as absent credentials for the structured-auth env suppression, not as chosen ones. The SDK types allow `authToken?: string | null`, and on v1.16.0 a typed null beside `credentials`, `config`, or `profile` defeated the `=== undefined` suppression check, so an ambient `ANTHROPIC_API_KEY` (or, with `apiKey: null`, an ambient `ANTHROPIC_AUTH_TOKEN`) silently authenticated instead of the configured provider and billed a different principal. The suppression now uses nullish checks: any combination of unset and explicitly null keeps the configured provider in charge, while a real `apiKey`/`authToken` string next to structured auth still forwards verbatim under the SDK's own precedence (which never consults the provider once either is set). The [Anthropic credential precedence](https://docs.rulvar.com/guide/providers#anthropic-credential-precedence) docs now state the SDK's actual order: a set `apiKey` or `authToken` disables token providers entirely; providers run only when both are null; a named `profile` skips both env reads inside the SDK itself.
  - @rulvar/core@1.16.1

## 1.16.0

### Minor Changes

- 5f76cf2: Structured auth wins over ambient env (v1.15 review P2-2). The underlying SDK lets any `apiKey`, one it read from `ANTHROPIC_API_KEY` included, beat a configured `credentials`/`config`/`profile` token provider: the provider was called zero times and requests carried `x-api-key` from the environment. When `sdkOptions` carries structured auth and no `apiKey`/`authToken` is set anywhere, the adapter now passes explicit `apiKey: null, authToken: null` to the SDK, so the configured provider is the one that authenticates regardless of what the environment exports. Setting an `apiKey` or `authToken` yourself next to structured auth keeps verbatim forwarding and the SDK's own precedence, which is now documented exactly (apiKey, then token providers, then authToken). Covered by synthetic tests for the provider, an end-to-end file-backed `profile` (static `user_oauth` token, `ANTHROPIC_CONFIG_DIR` isolated, 0600 credentials), and the explicit-key-beside-provider case.

### Patch Changes

- @rulvar/core@1.16.0

## 1.15.0

### Minor Changes

- 4aee1f3: Production auth surface (v1.14 review P2-2). New `sdkOptions` on `AnthropicAdapterOptions` forwards official SDK construction options verbatim, `maxRetries` excluded from the type (`AnthropicSdkOptions`) and forced to 0: bearer `authToken`, an `AccessTokenProvider` via `credentials`, `config` (OIDC/workload-identity federation), `profile`, plus `fetch`, `timeout`, and `defaultHeaders`. The `client` option now accepts the official `Anthropic` instance directly under strict TypeScript, no casts, alongside the structural `AnthropicClientLike` mock; an injected client with SDK autoretries enabled (`maxRetries !== 0`) is rejected with a typed `ConfigError`, as are `client` combined with construction options and the same field set both top-level and in `sdkOptions`, all before any network I/O. The implicit SDK credential chain (`ANTHROPIC_API_KEY`, then bearer `ANTHROPIC_AUTH_TOKEN`, then config files) is now documented and covered by tests.

### Patch Changes

- @rulvar/core@1.15.0

## 1.14.0

### Patch Changes

- @rulvar/core@1.14.0

## 1.13.0

### Patch Changes

- @rulvar/core@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

## 1.11.0

### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

## 1.10.0

### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

## 1.9.0

### Minor Changes

- 7577f8e: Correct the Anthropic fallback pricing to the official table and export versioned price tables from both first-party adapters.

  The `ANTHROPIC_MODELS` seed rows had never been audited against the published price list and overcharged every current Claude model: Fable 5 was seeded at exactly 2x the official rate (20/100 vs 10/50 per MTok, cache rates likewise), Opus 4.8 at 12/60 vs 5/25, Opus 4.7 at 10/50 vs 5/25, and Opus 4.6 at 15/75 vs 5/25. Claude Sonnet 5 now carries its introductory price (2/10, in effect through 2026-08-31); Haiku 4.5 and Sonnet 4.6 were already correct. Cost reports for affected models drop accordingly, and budget ceilings admit roughly twice the work they previously rejected.

  New exports `ANTHROPIC_PRICING` (`anthropic-2026-07-16`) and `OPENAI_PRICING` (`openai-2026-07-16`) publish the seed rows as versioned `PriceTable`s for `createEngine({ pricing })`, so runs journal a concrete pricing version instead of `unpriced` and price revisions become explicit table updates. `createTestEngine` gained a `pricing` passthrough for testing against a versioned table.

### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

## 1.8.0

### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

## 1.7.0

### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

## 1.6.0

### Minor Changes

- df416fc: Correct and extend model pricing: GPT-5.6 entries, long-context tiers, no fabricated prices, no double-charged cache.

  - `Pricing` gains optional long-context `tiers` (`PricingTier`): the highest threshold strictly below the full prompt re-prices the entire request, input-side rates (cache included) scaling by `inputMultiplier` and the output rate by `outputMultiplier`. Existing linear rows are untouched.
  - `@rulvar/openai` seeds `gpt-5.6-sol` and its `gpt-5.6` alias with the official caps and pricing (1,050,000 context, 128,000 max output, $5/$0.50/$30 per MTok, $6.25 cache write, 2x input and 1.5x output above 272K input tokens). Previously the unknown-model fallback silently priced them as gpt-5.4.
  - Unknown model ids in both first-class adapters keep conservative transport caps but no longer receive a fabricated price row: their usage surfaces in `CostReport.unpriced` and a USD ceiling warns that it cannot bound them. Provide a versioned `createEngine({ pricing })` row for hosted models the tables do not know yet.
  - `priceUsdOf` no longer double-charges cache tokens: under the Usage invariant `inputTokens` is the full prompt, so the input rate now bills only the uncached remainder while cache reads and writes bill at their own rates (a row without cache rates bills them at the input rate). Cache-heavy runs previously over-attributed cost by the full input rate on every cached token.
  - Admission reserve estimation routes through the same `priceUsdOf`, so estimates and settled costs share one formula, tiers included.
  - Model id resolution picks the longest matching table prefix, so a dated `gpt-5.5-pro-...` snapshot resolves to the pro entry, never the shorter `gpt-5.5` sibling.

- 886d065: Make the first-class adapters genuinely streaming: every canonical event is yielded AS its provider event is consumed.

  Both adapters (and `openaiCompatible`) buffered the complete canonical event stream in an internal array and yielded it only after the provider response finished. Consequences fixed by this change: `agent:stream` was never live; the stream-idle watchdog saw zero events during healthy generation, so any turn longer than `streamIdleTimeoutMs` (default 120s) was falsely severed as idle and retried; a budget or external abort lost ALL partial usage (the journal recorded zero for tokens the provider billed); and every delta of a long response was retained in memory.

  - `mapAnthropicStream`, `mapResponsesStream`, and `mapChatCompletionsStream` are now async generators: they yield each `ChatEvent` as the corresponding provider event is consumed, with the consumer's pull as the only pacing (natural backpressure, no queue, no detached work). The Anthropic mapper's return value carries the accumulated `pause_turn` state; `TurnMapping` no longer has the redundant `events` array field. Callers of the old callback signatures (`emit` parameter) must switch to iterating the generator.
  - Adapter behavior is preserved: canonical id mapping, thinking/reasoning retention, `pause_turn` continuation and its cap (each segment now streams live before the continuation dispatches), tool argument assembly, typed refusals and errors, exactly one canonical terminal event, the degraded Chat Completions path (visible in `providerMetadata.openai.degradedPath`), abort propagation, usage normalization, and SDK autoretries disabled.
  - New regression tests with gated fake SDK clients prove the first `stream().next()` resolves before the provider terminal exists, aborts reach the in-flight provider iterable after the first delta, a paused consumer causes zero read-ahead (lock-step pulls), `pause_turn` segment deltas arrive before the continuation request, and exactly one terminal event survives.

### Patch Changes

- da4dbad: Write the product name as Rulvar in prose: package READMEs, npm descriptions, and the
  documentation site now capitalize the brand. Identifiers keep their exact casing, so
  package names, the `rulvar` binary, `rulvar.config.mjs`, the `.rulvar` store directory,
  the `rulvar.*` OTel attributes, and every URL are unchanged. Documentation and metadata
  only; no runtime behaviour changes.
- Updated dependencies [da4dbad]
- Updated dependencies [487da86]
- Updated dependencies [df416fc]
- Updated dependencies [a737810]
- Updated dependencies [9eb66b4]
  - @rulvar/core@1.6.0

## 1.5.2

### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

## 1.5.1

### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

## 1.5.0

### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

## 1.4.0

### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

## 1.3.2

### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

## 1.3.1

### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

## 1.3.0

### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

## 1.2.0

### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

## 1.1.0

### Patch Changes

- f2253cb: The adapter scrubs constrained-decoding-unsupported keywords from the wire copy of strict tool schemas and output format schemas (`minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`, `maxItems`; measured live, docs/04 section 4.3 as amended). The orchestrator's spawn tools carry integer minimums, so every live orchestrate run died with a pre-first-call 400 ("For 'integer' type, property 'minimum' is not supported") at zero cost, which is what kept criterion 2 of the M12 checkpoint unmeasurable. The engine-side schema stays unscrubbed and still validates tool args and structured output, so the dropped keywords remain enforced; only the model-side hint is lost.
- 63b2c01: Two defects the first live M12 checkpoint run surfaced. The Anthropic capability table lacked a Haiku 4.5 entry, so the dated id fell through to the current-generation default and the adapter sent adaptive thinking, which that model rejects with a live 400 (every haiku run died at zero cost): `claude-haiku-4-5` (and its dated snapshots by the prefix rule) now resolves to the enabled-budget thinking form with real haiku pricing, meaning the default wire omits thinking entirely. And the checkpoint's criterion 2 could pass vacuously when both arms scored zero at zero cost (zero satisfies "at least equal at no more cost"): the card-informed arm must now win something real (nonzero n and pass rate) before the criterion can hold.
- 99dc3ed: The second Haiku 4.5 wire incompatibility (the first live probe after the caps entry): the model also rejects the top-level effort parameter with a 400, so its capability entry now declares empty reasoningEfforts and the router scrubs effort off the wire (the requested effort stays in identity). Verified live: a haiku run completes ok.
- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies [0e0b569]
- Updated dependencies [b28b7a3]
- Updated dependencies [b53a89e]
- Updated dependencies [4454175]
- Updated dependencies [6599ca8]
- Updated dependencies [6649e5f]
- Updated dependencies [fd2f83b]
- Updated dependencies [01d6b2d]
- Updated dependencies [9a20dbb]
- Updated dependencies [0fbe7ea]
- Updated dependencies [ebe0abc]
- Updated dependencies [a3079d0]
- Updated dependencies [596a39b]
- Updated dependencies [464ab6e]
  - @rulvar/core@1.0.0

## 0.9.0

### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [85d55cf]
- Updated dependencies [b88c9e3]
- Updated dependencies [f3c4613]
- Updated dependencies [a41c20f]
- Updated dependencies [f4e70be]
- Updated dependencies [75d1646]
- Updated dependencies [0627413]
- Updated dependencies [55c0f87]
- Updated dependencies [fd33871]
- Updated dependencies [e70e7f4]
- Updated dependencies [bc9c903]
  - @rulvar/core@0.8.0

## 0.7.0

### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

## 0.6.0

### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

## 0.5.0

### Minor Changes

- ac274f4: M4-T01 role protocol completion. The full trigger protocol for the six
  invocation roles lands in `@rulvar/core` (`model/roles.ts`):

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

- 5735d92: M4-T02 HistoryProjector. Cross-provider history projection lands in
  `@rulvar/core` (`model/projector.ts`) and the retention pipeline that
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
    turn's canonical assistant message. `@rulvar/anthropic` ships thinking
    and redacted_thinking blocks (signatures intact, pause_turn
    continuations included); `@rulvar/openai` ships reasoning items with
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

### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

## 0.2.0

### Minor Changes

- 527c9b4: M1-T12/T13: the two first-class adapters on the July 2026 surfaces.
  @rulvar/anthropic: adaptive thinking, the output_config umbrella (effort
  passthrough including max, native json_schema format), strict tools,
  cache_control compilation from cacheHint (deepest-4 kept), thinking-block
  retention with provider-granularity projection, pause_turn absorption
  without synthetic user messages, the full stop-reason table with typed
  refusal stop details, count_tokens, capabilities-bearing refreshCaps,
  retry-after/x-ratelimit/529 signaling, SDK autoretries disabled, usage
  normalization under the Usage invariant. @rulvar/openai: Responses API
  with manual item replay only (store false, encrypted reasoning echoed
  verbatim; previous_response_id/Conversations rejected as ConfigError),
  flattened strict function tools, text.format json_schema, the typed SSE
  catalog mapped to ChatEvent, the Chat Completions degraded path (visible
  via providerMetadata), effort mapping with the documented lossy
  max-to-xhigh downmap and provider none via providerOptions only, usage
  normalization.

### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

## 0.1.0

### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0
