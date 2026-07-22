---
title: Changelog
description: "Per-package release notes for the @rulvar packages, aggregated from the Changesets changelogs."
editLink: false
---

<!--
  This page is generated from packages/*/CHANGELOG.md on every
  documentation build (docs/scripts/build-changelog.mjs). Do not
  edit it directly - Changesets owns the per-package changelogs.
-->

# Changelog

All packages in the fixed group release in lockstep with identical
versions; `@rulvar/compat` is versioned independently. The sections
below mirror each package's `CHANGELOG.md` as written by Changesets.

## @rulvar/anthropic

### 1.44.0

#### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0

### 1.43.0

#### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

### 1.42.0

#### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

### 1.41.0

#### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

### 1.40.0

#### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

### 1.39.0

#### Patch Changes

- @rulvar/core@1.39.0

### 1.38.0

#### Patch Changes

- @rulvar/core@1.38.0

### 1.37.0

#### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

### 1.36.0

#### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

### 1.35.0

#### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

### 1.34.0

#### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

### 1.33.0

#### Patch Changes

- @rulvar/core@1.33.0

### 1.32.0

#### Patch Changes

- @rulvar/core@1.32.0

### 1.31.0

#### Patch Changes

- df6b8f8: `Retry-After` accepts HTTP optional whitespace padding only. ECMAScript `trim()` removed far more than the OWS production (space and horizontal tab), so values padded with newline, carriage return, vertical tab, form feed, or NBSP were honored as delays despite the documented exact delta seconds grammar; a real HTTP transport rejects most of those octets, but an injected SDK client or a mock does not. Both first party adapters now match `/^[\t ]*([0-9]+)[\t ]*$/` and fall back to the computed policy backoff for every other form.
  - @rulvar/core@1.31.0

### 1.30.0

#### Patch Changes

- 87ce985: Parse `Retry-After` under the exact RFC delta seconds grammar (v1.29.0 review P3). Published 1.29.0 used `Number(header)`, which accepted far more than the documented delta seconds form: an empty or whitespace header became a 0 ms delay (an instant retry instead of the policy backoff), and hex (`0x10`), exponent (`1e3`), decimal (`1.5`), and signed (`+3`) forms were honored as delays. The value must now be a nonempty run of decimal digits after optional whitespace; every other form (the HTTP date included) omits `retryAfterMs` so the engine's computed backoff applies, and a huge digit run still clamps to the Node timer maximum.
- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

### 1.29.0

#### Minor Changes

- 621d566: Make the retry and failover backoff interruptible and validate every provider supplied retry delay (v1.28.0 review P1 and P2).

  The retry engine now races its backoff wait against the host cancel signal (which the run deadline also drives) and the budget ceiling signal: an abort wakes the wait immediately, settles through the canonical aborted outcome (`cancelled` or `exhausted`, with every already recorded usage kept), and forbids every further dispatch, including the one behind a keyed limiter queue, so an adapter that ignores its signal can no longer be re entered after an abort. Previously a provider supplied `retryAfterMs` armed an uninterruptible sleep: a cancel, a crossed deadline, and a crossed budget ceiling all waited out the full backoff and the adapter was dispatched again. The injected `retry.sleep(ms)` test hook keeps its signature; a hook that loses the race is abandoned without an unhandled rejection, and the native timer path clears its timer so an abandoned long backoff never pins the event loop.

  `retryDelayMs` is now the defensive boundary the docs promise: only a finite nonnegative provider `retryAfterMs` replaces the computed delay, anything else (NaN, Infinity, a negative) is ignored as adapter noise, and every returned delay is a finite nonnegative integer clamped to the Node timer maximum, so a malformed or huge value can never arm an instant or overflowing timer. Both first party adapters stop emitting unvalidated `Retry-After` parses: an unparsable header (the HTTP date form included) omits `retryAfterMs` entirely instead of producing NaN (which also broke the `WireError.data` Json invariant by serializing to null), and a huge but finite value is clamped. The `mapAnthropicStream` TSDoc now states precisely how a truncated stream is reported (the `finished` flag on the return value, with the adapter synthesizing the terminal error).

  Four frozen fixture cassettes are refrozen for this release (the hashVersion-bump refreeze ceremony applies; hashVersion itself is unchanged and existing journals replay identically): in three cap freeze scenarios the main orchestrator entry now honestly settles cancelled at the cap instead of paying one more ordinary turn whose result the forced finish machinery discarded anyway, and one scenario loses a post abort wait suspension that can no longer be dispatched. Entry identities, keys, and every other row are byte identical.

#### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

### 1.28.0

#### Minor Changes

- d98eb0b: Enforce the terminal stream contract end to end (v1.27.0 deep E2E review P1 and P2). The runtime now fails closed when an adapter stream drains without a terminal `finish` or `error` event: the partial turn becomes a retryable transport fault that feeds the ordinary retry and failover machinery instead of settling as `ok` with truncated text, and a requested abort (cancel, budget ceiling, idle severance) remains a clean end with no fabricated provider error. Consumption stops at the first terminal event, so events after `finish` can no longer mutate the value, revise the authoritative bill, or trigger tool execution. The first party adapters enforce the same contract at the wire: the Chat Completions mapper no longer synthesizes `finish: stop` when the stream is cut before a `finish_reason` (usage the provider did report is still forwarded, half assembled tool calls are dropped), the Responses mapper fails closed on EOF without a response terminal event, and the Anthropic adapter surfaces a read cut before `message_stop` as a retryable transport error and no longer converts a caller requested abort during `messages.create()` into a terminal error. `mapResponsesStream` and `mapChatCompletionsStream` accept an optional `signal` so a requested abort keeps ending the stream without a terminal event. The VCR `record` wrapper now commits its cassette row even when the consumer stops reading at the terminal event (the engine always does now); adapter middleware must not rely on being drained past the terminal. The committed `combined-loop-descent` catalog cassette is refrozen because stopping consumption at the terminal shifts the deterministic interleaving of two parallel plan children by one scheduler turn; entry content, keys, and the actual `hashVersion` are unchanged, journals recorded under earlier versions replay unchanged, and this changeset carries the frozen fixture gate's hashVersion-bump ceremony token only to unlock that refreeze.

#### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

### 1.27.0

#### Minor Changes

- 884a433: Types referenced by public signatures are now exported from their package barrels, so the API docs resolve them instead of carrying known incomplete references (v1.26.0 deep E2E review): `BaseAppend` from `@rulvar/core` (the fields common to every `Replayer` append), `Block` and `MappedStop` from `@rulvar/anthropic` (the wire level content block alias and the stop reason mapping), and `VcrHeader` from `@rulvar/testing` (the first line of every cassette file). The frozen TypeDoc baseline shrinks from eleven entries to the four vendored Standard Schema notices.

#### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

### 1.26.0

#### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

### 1.25.0

#### Patch Changes

- @rulvar/core@1.25.0

### 1.24.1

#### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

### 1.24.0

#### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

### 1.23.0

#### Patch Changes

- 1f9c272: The `anthropic()` TSDoc no longer describes the SDK's ambient credentials as a precedence chain (v1.22.0 review P3-2). `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` are independent credentials: requests carry `x-api-key` for the key, bearer `Authorization` for the token, and BOTH headers when both are set; the config-file token-provider chain is consulted only when apiKey and authToken are both null. The providers guide already said exactly this; the source doc (and the generated API page built from it) had drifted.
- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

### 1.22.0

#### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

### 1.21.0

#### Patch Changes

- 7ee42a0: Declare `usageSemantics: 'anthropic-cache-additive-v1'` on the adapter: the additive reading it has always normalized under (the Anthropic wire genuinely excludes cache reads and writes from `input_tokens`, so canonical `inputTokens` is the sum of all three) now rides usage-bearing journal entries as an auditable policy stamp (v1.20.0 review P1/P2-2).
- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

### 1.20.0

#### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

### 1.19.0

#### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

### 1.18.0

#### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

### 1.17.0

#### Patch Changes

- @rulvar/core@1.17.0

### 1.16.2

#### Patch Changes

- 9f07130: Correct five stale rows in the seed capability table: Claude Opus 4.8, Opus 4.7, Opus 4.6, Sonnet 5, and Sonnet 4.6 all carry a 1M context window and 128k max output, verified against the official models table and live `GET /v1/models` on 2026-07-17. Default routing, the compaction threshold, and the wire `max_tokens` clamp no longer under-provision runs that never call `refreshCaps()` (Sonnet 5 was clamped to 64k output for no reason). Every row is now pinned by a committed `caps-snapshot.json`: an offline test fails when the table and the snapshot disagree, and the weekly live contract workflow audits the snapshot against the model list so provider-side drift pages instead of rotting. Pricing rows are untouched.
  - @rulvar/core@1.16.2

### 1.16.1

#### Patch Changes

- fac1ecc: Treat explicit `apiKey: null`/`authToken: null` as absent credentials for the structured-auth env suppression, not as chosen ones. The SDK types allow `authToken?: string | null`, and on v1.16.0 a typed null beside `credentials`, `config`, or `profile` defeated the `=== undefined` suppression check, so an ambient `ANTHROPIC_API_KEY` (or, with `apiKey: null`, an ambient `ANTHROPIC_AUTH_TOKEN`) silently authenticated instead of the configured provider and billed a different principal. The suppression now uses nullish checks: any combination of unset and explicitly null keeps the configured provider in charge, while a real `apiKey`/`authToken` string next to structured auth still forwards verbatim under the SDK's own precedence (which never consults the provider once either is set). The [Anthropic credential precedence](https://docs.rulvar.com/guide/providers#anthropic-credential-precedence) docs now state the SDK's actual order: a set `apiKey` or `authToken` disables token providers entirely; providers run only when both are null; a named `profile` skips both env reads inside the SDK itself.
  - @rulvar/core@1.16.1

### 1.16.0

#### Minor Changes

- 5f76cf2: Structured auth wins over ambient env (v1.15 review P2-2). The underlying SDK lets any `apiKey`, one it read from `ANTHROPIC_API_KEY` included, beat a configured `credentials`/`config`/`profile` token provider: the provider was called zero times and requests carried `x-api-key` from the environment. When `sdkOptions` carries structured auth and no `apiKey`/`authToken` is set anywhere, the adapter now passes explicit `apiKey: null, authToken: null` to the SDK, so the configured provider is the one that authenticates regardless of what the environment exports. Setting an `apiKey` or `authToken` yourself next to structured auth keeps verbatim forwarding and the SDK's own precedence, which is now documented exactly (apiKey, then token providers, then authToken). Covered by synthetic tests for the provider, an end-to-end file-backed `profile` (static `user_oauth` token, `ANTHROPIC_CONFIG_DIR` isolated, 0600 credentials), and the explicit-key-beside-provider case.

#### Patch Changes

- @rulvar/core@1.16.0

### 1.15.0

#### Minor Changes

- 4aee1f3: Production auth surface (v1.14 review P2-2). New `sdkOptions` on `AnthropicAdapterOptions` forwards official SDK construction options verbatim, `maxRetries` excluded from the type (`AnthropicSdkOptions`) and forced to 0: bearer `authToken`, an `AccessTokenProvider` via `credentials`, `config` (OIDC/workload-identity federation), `profile`, plus `fetch`, `timeout`, and `defaultHeaders`. The `client` option now accepts the official `Anthropic` instance directly under strict TypeScript, no casts, alongside the structural `AnthropicClientLike` mock; an injected client with SDK autoretries enabled (`maxRetries !== 0`) is rejected with a typed `ConfigError`, as are `client` combined with construction options and the same field set both top-level and in `sdkOptions`, all before any network I/O. The implicit SDK credential chain (`ANTHROPIC_API_KEY`, then bearer `ANTHROPIC_AUTH_TOKEN`, then config files) is now documented and covered by tests.

#### Patch Changes

- @rulvar/core@1.15.0

### 1.14.0

#### Patch Changes

- @rulvar/core@1.14.0

### 1.13.0

#### Patch Changes

- @rulvar/core@1.13.0

### 1.12.0

#### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

### 1.11.0

#### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

### 1.10.0

#### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

### 1.9.0

#### Minor Changes

- 7577f8e: Correct the Anthropic fallback pricing to the official table and export versioned price tables from both first-party adapters.

  The `ANTHROPIC_MODELS` seed rows had never been audited against the published price list and overcharged every current Claude model: Fable 5 was seeded at exactly 2x the official rate (20/100 vs 10/50 per MTok, cache rates likewise), Opus 4.8 at 12/60 vs 5/25, Opus 4.7 at 10/50 vs 5/25, and Opus 4.6 at 15/75 vs 5/25. Claude Sonnet 5 now carries its introductory price (2/10, in effect through 2026-08-31); Haiku 4.5 and Sonnet 4.6 were already correct. Cost reports for affected models drop accordingly, and budget ceilings admit roughly twice the work they previously rejected.

  New exports `ANTHROPIC_PRICING` (`anthropic-2026-07-16`) and `OPENAI_PRICING` (`openai-2026-07-16`) publish the seed rows as versioned `PriceTable`s for `createEngine({ pricing })`, so runs journal a concrete pricing version instead of `unpriced` and price revisions become explicit table updates. `createTestEngine` gained a `pricing` passthrough for testing against a versioned table.

#### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

### 1.8.0

#### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

### 1.7.0

#### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

### 1.6.0

#### Minor Changes

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

#### Patch Changes

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

### 1.5.2

#### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

### 1.5.1

#### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

### 1.5.0

#### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

### 1.4.0

#### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

### 1.3.0

#### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

### 1.2.0

#### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

### 1.1.0

#### Patch Changes

- f2253cb: The adapter scrubs constrained-decoding-unsupported keywords from the wire copy of strict tool schemas and output format schemas (`minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`, `maxItems`; measured live, docs/04 section 4.3 as amended). The orchestrator's spawn tools carry integer minimums, so every live orchestrate run died with a pre-first-call 400 ("For 'integer' type, property 'minimum' is not supported") at zero cost, which is what kept criterion 2 of the M12 checkpoint unmeasurable. The engine-side schema stays unscrubbed and still validates tool args and structured output, so the dropped keywords remain enforced; only the model-side hint is lost.
- 63b2c01: Two defects the first live M12 checkpoint run surfaced. The Anthropic capability table lacked a Haiku 4.5 entry, so the dated id fell through to the current-generation default and the adapter sent adaptive thinking, which that model rejects with a live 400 (every haiku run died at zero cost): `claude-haiku-4-5` (and its dated snapshots by the prefix rule) now resolves to the enabled-budget thinking form with real haiku pricing, meaning the default wire omits thinking entirely. And the checkpoint's criterion 2 could pass vacuously when both arms scored zero at zero cost (zero satisfies "at least equal at no more cost"): the card-informed arm must now win something real (nonzero n and pass rate) before the criterion can hold.
- 99dc3ed: The second Haiku 4.5 wire incompatibility (the first live probe after the caps entry): the model also rejects the top-level effort parameter with a 400, so its capability entry now declares empty reasoningEfforts and the router scrubs effort off the wire (the requested effort stays in identity). Verified live: a haiku run completes ok.
- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

### 1.0.0

#### Patch Changes

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

### 0.9.0

#### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

### 0.8.0

#### Patch Changes

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

### 0.7.0

#### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

### 0.6.0

#### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

### 0.5.0

#### Minor Changes

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

#### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

### 0.4.0

#### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

### 0.3.0

#### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

### 0.2.0

#### Minor Changes

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

#### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

#### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0

## @rulvar/bridge-ai-sdk

### 1.44.0

#### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0

### 1.43.0

#### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

### 1.42.0

#### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

### 1.41.0

#### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

### 1.40.0

#### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

### 1.39.0

#### Patch Changes

- @rulvar/core@1.39.0

### 1.38.0

#### Patch Changes

- @rulvar/core@1.38.0

### 1.37.0

#### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

### 1.36.0

#### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

### 1.35.0

#### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

### 1.34.0

#### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

### 1.33.0

#### Patch Changes

- @rulvar/core@1.33.0

### 1.32.0

#### Patch Changes

- @rulvar/core@1.32.0

### 1.31.0

#### Patch Changes

- @rulvar/core@1.31.0

### 1.30.0

#### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

### 1.29.0

#### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

### 1.28.0

#### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

### 1.27.0

#### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

### 1.26.0

#### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

### 1.25.0

#### Patch Changes

- @rulvar/core@1.25.0

### 1.24.1

#### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

### 1.24.0

#### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

### 1.23.0

#### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

### 1.22.0

#### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

### 1.21.0

#### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

### 1.20.0

#### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

### 1.19.0

#### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

### 1.18.0

#### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

### 1.17.0

#### Patch Changes

- @rulvar/core@1.17.0

### 1.16.2

#### Patch Changes

- @rulvar/core@1.16.2

### 1.16.1

#### Patch Changes

- @rulvar/core@1.16.1

### 1.16.0

#### Patch Changes

- @rulvar/core@1.16.0

### 1.15.0

#### Patch Changes

- @rulvar/core@1.15.0

### 1.14.0

#### Patch Changes

- @rulvar/core@1.14.0

### 1.13.0

#### Patch Changes

- @rulvar/core@1.13.0

### 1.12.0

#### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

### 1.11.0

#### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

### 1.10.0

#### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

### 1.9.0

#### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

### 1.8.0

#### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

### 1.7.0

#### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

### 1.6.0

#### Patch Changes

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

### 1.5.2

#### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

### 1.5.1

#### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

### 1.5.0

#### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

### 1.4.0

#### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

### 1.3.0

#### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

### 1.2.0

#### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

### 1.1.0

#### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

### 1.0.0

#### Minor Changes

- b728c48: M9-T01: bridgeAiSdk, the long-tail provider bridge (docs/04 section 7; FR-1xx). First real public surface of @rulvar/bridge-ai-sdk.

  - `bridgeAiSdk(model, options?)` wraps any Vercel AI SDK LanguageModelV4 (`@ai-sdk/provider` ^4, catalog-pinned per docs/13 "Dependency baseline pins") as a rulvar ProviderAdapter for the long tail (Google, Bedrock, Vertex). A wrong `specificationVersion` fails at construction with a typed ConfigError, so a transitive provider-package major cannot mis-wire silently.
  - The full ChatEvent vocabulary streams through: text and reasoning deltas, tool-call start/delta/end with engine-minted canonical ids mapped bijectively onto the wrapped provider's wire ids, incremental-free usage normalized under the Usage invariant (inputTokens always covers cache reads and writes), typed finish outcomes (length to max-tokens, content-filter to a typed refusal carrying the raw stop reason), and exactly one terminal event per stream.
  - Retention rides `finish.providerMetadata[<id>].retainedParts` (docs/04 section 2.3): assembled reasoning parts with their provider signatures, custom blocks, generated files, and provider-executed tool exchanges round-trip to same-family models; response-side providerMetadata reinserts as prompt-side providerOptions.
  - Conservative caps for a surface that has no introspection (the openaiCompatible posture, except structuredOutput 'native' because V4 responseFormat json is the interface-native mechanism); `options.caps` overrides per model. Canonical effort maps one to one for low/medium/high/xhigh; `max` downmaps to `xhigh` and the downmap is recorded in providerMetadata. cacheHint is ignored silently per docs/04 section 1.7.
  - Errors: `aiSdkErrorToWire` projects thrown APICallErrors as typed WireErrors (429 as retryable rate-limit with retryAfterMs from the retry-after header; 5xx and status-less network failures retryable transport; other statuses terminal). Documented as the highest-churn package in the set; its provider-major bumps ride BREAKING releases, never minors.

#### Patch Changes

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

### 0.9.0

#### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

### 0.8.0

#### Patch Changes

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

### 0.7.0

#### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

### 0.6.0

#### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

### 0.5.0

#### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

### 0.4.0

#### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

### 0.3.0

#### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

### 0.2.0

#### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

#### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0

## @rulvar/cli

### 1.44.0

#### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0

### 1.43.0

#### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

### 1.42.0

#### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

### 1.41.0

#### Minor Changes

- be589ec: Add the orchestrate acceptance policy and the CLI --strict flag (the v1.40.0 improvement plan's completion contract)

  Run status ok proves that finish validated, and nothing more: the model may
  call finish after any mix of child outcomes, so ok alone never proves the
  children succeeded. The new opt in OrchestrateOptions.acceptance turns that
  into a checked contract. childPolicy 'all-ok' requires every spawned child to
  have settled ok when finish validates (a child still running counts against
  it); { minSuccessful: N } tolerates failures beyond the first N successes.
  The verdict is journaled as one decision entry, so a resume rolls the same
  verdict forward, immune to drift of the live options. An accepted result
  becomes the acceptance envelope { result, completion, childStatusCounts,
  degradedReasons }; a violated policy fails the run with the typed
  FailRunError (code fail_run, data.source 'orchestrator_acceptance') instead
  of settling ok. Without acceptance nothing changes: the result value stays
  the raw finish payload and no new journal entry is written.

  The CLI pairs with the envelope: rulvar run --strict and rulvar resume
  --strict exit nonzero when a settled ok value reports completion 'partial',
  printing the degraded reasons (strictExitCode is exported for hosts). The
  guides also now state the adjacent contracts plainly: await_any and await_all
  return truncated TaskDigests rather than full child reports, cost totals are
  price registry estimates with usageApprox marking estimated usage, the
  fencing epoch covers journal appends while RunMeta and transcript blobs stay
  advisory projections, and data protection at rest is owned by the host.

#### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

### 1.40.0

#### Minor Changes

- cf33550: Fence the offline resolution append and surface approximate usage (v1.39.0 review)

  The CLI server's offline resolution path acquired a store lease but never
  threaded it into the Replayer, so the resolution append ran unfenced: if the
  process stalled past its lease ttl and a queue worker took the run over, the
  stale append could land alongside the new owner's writes. The append now
  carries the acquired lease, so a superseded owner is rejected with
  LeaseHeldError (HTTP 409) instead of racing the current owner.

  Approximate usage is now visible where the run is reported. usageApprox rides
  the agent:end and run:end events and the CostReport, and the CLI cost line
  marks an estimated total, so a total that includes usage estimated after a
  transport cut, a ceiling that severed a stream, or an abort is never shown as
  though it were the exact provider charge. The field is present only when true,
  so every exact usage report and event is byte for byte unchanged.

#### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

### 1.39.0

#### Patch Changes

- @rulvar/core@1.39.0

### 1.38.0

#### Patch Changes

- @rulvar/core@1.38.0

### 1.37.0

#### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

### 1.36.0

#### Minor Changes

- 101795b: Validate `createWorker` timers and make the TTL match promise executable (v1.35.0 review P2). `ttlMs` and `pollMs` must be integers between 1 and 2147483647 ms, refused typed at construction (an overflow or non finite cadence collapsed to the 1 ms interval floor and stormed the store). A store exposing the optional `leaseTtlMs` capability is verified against the worker ttl, a mismatch is a `ConfigError`, and an omitted `ttlMs` adopts the store's value.

#### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

### 1.35.0

#### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

### 1.34.0

#### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

### 1.33.0

#### Patch Changes

- @rulvar/core@1.33.0

### 1.32.0

#### Patch Changes

- @rulvar/core@1.32.0

### 1.31.0

#### Patch Changes

- @rulvar/core@1.31.0

### 1.30.0

#### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

### 1.29.0

#### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

### 1.28.0

#### Minor Changes

- d98eb0b: The documented spaced syntax of numeric flags now reaches the canonical validation for negative values: `rulvar run wf --budget-usd -1` reports `--budget-usd must be a positive number` instead of the generic parseArgs ambiguity error (v1.27.0 review P3). The fold applies only to strictly numeric negative tokens after a numeric flag (`--budget-usd`, `--planning-budget-usd`); unknown option, duplicate flag, and missing value diagnostics are unchanged.

#### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

### 1.27.0

#### Minor Changes

- 884a433: The HTTP shell's SSE delivery is now complete and bounded per connection (v1.26.0 deep E2E review). A terminal settle closes connected streams only AFTER the segment's event pump has drained, so a client that keeps reading receives the full tail including the terminal `run:end` instead of a clean close that silently swallowed the backlog; when the pump itself failed, the close is preceded by an SSE comment saying the stream may be incomplete. New `maxPendingEventsPerClient` option (default 10000) bounds what any single SSE connection can accumulate unread, independently of the replay buffer: a consumer that stopped reading is unhooked at the bound and closed with an SSE comment naming it, the frames already queued stay readable, and the standard `Last-Event-ID` reconnect resumes strictly after the last frame the client consumed; a replay longer than the bound is delivered the same way, in bounded chunks across reconnects, so pending memory per connection is O(bound) while delivery stays at least once. `createServer` now validates its numeric caps at construction with a typed `ConfigError` (`maxTrackedRuns` accepts non negative safe integers, `maxBufferedEventsPerRun` and `maxPendingEventsPerClient` accept positive safe integers): `NaN` used to silently mean unbounded, `Infinity` looked like a cap without capping, and negative or fractional values produced policies nobody asked for. The barrel additionally exports `DEFAULT_MAX_PENDING_EVENTS_PER_CLIENT` and the referenced types `KbSweepCliConfig`, `LoadedWorkflowModule`, and `OtelContextApi`, so every public signature resolves in the API docs.

#### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

### 1.26.0

#### Minor Changes

- a4fc757: The HTTP shell decouples process memory from durable retention (v1.25.0 scale review): new `memoryRetention` predicate and `maxTrackedRuns` cap release a settled run's tracked state (args, outcome, handle, SSE buffer) while the journal and transcripts stay, and new `maxBufferedEventsPerRun` bounds each run's SSE replay buffer (oldest events dropped in chunks and counted; a replay that lost events carries an `x-rulvar-events-dropped` header, and a client whose cursor predates the retained window gets a leading SSE comment naming the first retained seq). The `Last-Event-ID` cursor is now a binary search over the seq ordered buffer and the replay streams by index (no buffer copy); a cursor seq the buffer does not hold replays everything strictly after it instead of re-flooding the whole buffer, which remains at least once. The queue worker sweeps candidates only (`listRuns({ statuses: ['running', 'suspended'] })`, widened to the full catalog only when durable `retention` needs terminal metas), never overlaps sweeps, keys its suspended skip cache and its poison set to the run's generation (`RunMeta.genesis`) so a `deleteRun` and recreate of the same runId is picked instead of skipped, and drops skip and poison entries for runIds that left the candidate set. Point lookups in `resume`, `inspect`, the kb gate, and the server status path go through the store's exact lookup capability when present.

#### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

### 1.25.0

#### Patch Changes

- 74851ed: CLI diagnostics stop echoing `--args` values and sanitize every dynamic value they embed. The invalid-JSON and non-canonical-JSON refusals now name the failure class and the way out without repeating the supplied value (workflow args may carry private data, and stderr routinely lands in CI logs). Every typed CLI error prints through one site that strips terminal control sequences, and the plain-output run renderers (outcome reports, dry-run previews, suspension prompts, resume warnings, plan lint diagnostics) sanitize untrusted text the same way the live TUI already does, so a hostile runId, suspension key, provider error message, or model ref cannot recolor, retitle, or rewrite the terminal. Exit semantics are unchanged.
  - @rulvar/core@1.25.0

### 1.24.1

#### Patch Changes

- 0bb14db: Close a resume args-gate bypass through JSON numeric overflow (v1.24.0 review P2-1). A `--args` value that overflowed JavaScript's finite range (`1e400` parses to `Infinity`) could not be canonicalized, so genesis recorded the args binding with `argsProvided` but no hash, and a later `resume` supplying entirely different args slipped past the gate with only a warning, silently changing the logical run and re-paying every args-dependent call. `rulvar run` and `rulvar resume` now reject non-finite (non-JCS) `--args` at parse time, before any config, store, or adapter loads. Independently, when a run recorded `argsProvided` without a verifiable hash (an in-process host that started it with genuinely non-JCS args), a `resume` supplying args is now a typed refusal unless you pass `--allow-args-change`, instead of the previous soft warning. Core engine policy is unchanged: in-process hosts may still pass non-JCS args and record presence without a hash.
- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

### 1.24.0

#### Minor Changes

- 2b033e8: Make `rulvar resume` safe against forgotten or changed args and add a `--dry-run` preview (the v1.23.0 review: a resume without `--args` silently changed the logical run and paid again). The resume grammar gains `--dry-run` and `--allow-args-change`. Before the engine starts, the CLI verifies the supplied args against the genesis binding recorded in `RunMeta`: forgetting `--args` on a run started with them, adding them to a run started without them, or supplying a different value is a typed refusal naming `--allow-args-change` as the deliberate override; runs recorded before v1.24.0 carry no binding and demand explicit `--args` or the override. `--dry-run` passes the engine's replay-strict mode through and prints the resume preview (hits, misses, reruns, skipped, orphaned effect roots, invalid resolutions) plus what the run would settle as, with zero journal or meta writes and zero adapter calls; a preview that reaches work needing a live call reports the stopping point and exits 0. `rulvar inspect` now prints the args binding.

#### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

### 1.23.0

#### Patch Changes

- 1f9c272: The renderers' remaining unsanitized paths and the malformed-event gaps (v1.22.0 review P2-2, P2-3).

  - `progress()`: the error text surfaced when the SOURCE fails (a rejected `RunHandle.result`, a rejected `Promise<RunHandle>`, a throwing iterable) went to the sink raw; a crafted rejection could inject ANSI, forge lines, and leak a key-shaped fragment. Every catch path now routes through one helper that secret-masks FIRST (the thrown value never crossed the event masking boundary) and terminal-sanitizes second; lines mode prints the notice as its own sanitized line instead of dropping it.
  - Malformed recognized events from a raw iterable can no longer stop a view: every dynamic field in the `progress()` reducer, its lines formatter, `renderProgress`, and the CLI `renderEventLine` is read through typed guards (a hostile object with a throwing `toString` included), a backstop catch skips a bad event with a bounded diagnostic carrying no untrusted data, and the stream continues. The v1.22.0 claim of full defensive reads was narrower in reality (`agent:stream` without `delta` or `phase:start` without `phase` stopped the raw-iterable view); it is true now and pinned by a table-driven test over every consumed type.
  - `posIntOption` wording: a below-minimum value CLAMPS to the minimum (only non-finite values fall back to the default); the JSDoc said "falls back" for both.
  - `@rulvar/cli` build config migrates the deprecated tsdown `external` option to `deps.neverBundle`; the packed dist keeps the companion specifiers external, byte-for-same behavior.

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

### 1.22.0

#### Patch Changes

- 77b554f: Sanitize the CLI event line renderer (`renderEventLine`, used by `attachProgress`): every composed line passes through the shared `sanitizeTerminalText` before it reaches the terminal, so an untrusted provider/tool/log string in an event can no longer inject a control sequence or a second physical line into CLI output (v1.21.0 review P2-1). Clean lines stay byte-identical.
- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

### 1.21.0

#### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

### 1.20.0

#### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

### 1.19.0

#### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

### 1.18.0

#### Minor Changes

- 943962d: Sweep and suite reports are now monotone: paid evidence survives every budget refusal. Previously `runSweepMatrix` caught the envelope's `SweepBudgetError` around a whole cell and replaced it with an empty `envelopeExhausted` row, erasing already completed targets and their cost; a judge refused by the envelope erased the paid successful target the same way; and a judge run that hit its own per-run ceiling threw `EvalJudgeError` out of the entire matrix, losing every accumulated cell.

  Now: `runEvalSuite` returns partial results with `plannedN`, `completedN`, and a typed `refusal` marker instead of throwing when the envelope refuses a target; a judge budget event (per-run ceiling exhaustion or envelope refusal) normalizes into the owning `EvalCaseResult` as `incomplete: { reason: 'judge-exhausted' | 'judge-refused' }` with the failing judge run's actual cost counted, while non-budget grader errors still throw; `SweepCellReport` gains `plannedN`, `judgeIncompleteRuns`, `incompleteReason`, and `refusedRunLabel`, and any incomplete cell (n < plannedN, exhausted targets, unfinished judges, or an envelope refusal) emits no claim; `runCanary` records an envelope-refused probe as `status: 'refused'` and keeps walking, so completed probe evidence survives and `allOk` stays the drift-flip gate; `EvalJudgeError` carries `costUsd`. The `kb sweep` human renderer prints incomplete cells explicitly (`INCOMPLETE: envelope refused ... after N of M case(s)`, unfinished-judge counts, refused-probe counts) instead of pretending nothing ran.

  Migration: `runSweepMatrix` and `runEvalSuite` no longer throw `SweepBudgetError` for refused targets or judges; read `EvalSuiteResult.refusal`, `EvalCaseResult.incomplete`, and the new cell fields instead. Cells now always carry `plannedN`.

#### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

### 1.17.0

#### Minor Changes

- 7909b6b: Every paid CLI surface is now budget-bounded, and the grammar ignores nothing (the v1.16.2 review P1-1, P1-2, P2-1, P3-1).

  - `rulvar plan` gained separate immutable ceilings for its two paid runs: `--planning-budget-usd N` freezes as the planning run's B0 at its journal's genesis (`PlanOptions.run.budgetUsd`) and `--budget-usd N` caps the execution run exactly like `rulvar run`. A machine-written workflow never runs unbounded silently: missing ceilings fail loudly unless `--allow-unbounded` waives them explicitly, and `--dry-run` beside `--budget-usd` is a contradiction, not an ignorable leftover.
  - `rulvar kb sweep` requires `kbSweep.budgets` (`{ targetUsd, judgeUsd, canaryUsd, maxTotalUsd }`) or an explicit `kbSweep.allowUnbounded: true`: every target, judge, and canary run carries an immutable per-run ceiling, the whole sweep authorizes against the debit-only `maxTotalUsd` envelope (falsification pool growth included), the worst-case authorized spend prints before the first provider call, and envelope-refused or ceiling-exhausted cells report honestly and emit no claim. Canary drift flips claims stale only when every probe settled `ok`, so a budget-starved or transiently failing probe can never blame the model.
  - The canonical grammar is one data structure now: `--help`, every per-command usage error, and the documented grammar block render from it and are locked together by tests. Nothing accepted is ignored: `resume` rejects `--budget-usd` and `--profile` at parse time (the ceiling is immutable from genesis by the documented budget invariant), every command enforces exact positional arity, duplicate value flags fail, and unknown options report as ConfigError usage lines instead of raw parseArgs stack traces. All rejections happen before any config, store, or adapter loads, with zero provider calls and byte-identical journals.

#### Patch Changes

- @rulvar/core@1.17.0

### 1.16.2

#### Patch Changes

- 9f07130: The published CLI now actually loads its command-local optional companions. The build had been inlining `@rulvar/planner`, `@rulvar/plan`, and `@rulvar/evals` into local chunks, so the packed `rulvar plan` failed with a false "install @rulvar/planner" even with the planner installed (the inlined eslint broke at load time and a bare catch reported it as missing), while `rulvar kb inbox` ran without `@rulvar/plan` installed, against the documented dependency contract. The three companions are external again (dist keeps the real `import("@rulvar/...")` specifiers, the planner's worker sandbox loads from the installed package, and the CLI dist shrinks from megabytes to about 82 kB), and import failures are classified: only a genuine module-not-found for the requested companion produces the install hint, while an installed companion that fails to initialize surfaces its own error with the cause preserved. A packed-consumer E2E matrix (`scripts/cli-smoke.mjs`) now gates releases on exactly this behavior.
  - @rulvar/core@1.16.2

### 1.16.1

#### Patch Changes

- fac1ecc: Mark eslint's optional TypeScript-config loader `jiti` as external in the CLI bundle. The bundled eslint (pulled in through @rulvar/planner's programmatic `Linter`) lazily imports `jiti` only on its config-file loading path, which the CLI never executes; the import now stays an import instead of producing UNRESOLVED_IMPORT build warnings. No runtime behavior change.
  - @rulvar/core@1.16.1

### 1.16.0

#### Patch Changes

- @rulvar/core@1.16.0

### 1.15.0

#### Patch Changes

- @rulvar/core@1.15.0

### 1.14.0

#### Patch Changes

- @rulvar/core@1.14.0

### 1.13.0

#### Patch Changes

- @rulvar/core@1.13.0

### 1.12.0

#### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

### 1.11.0

#### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

### 1.10.0

#### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

### 1.9.0

#### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

### 1.8.0

#### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

### 1.7.0

#### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

### 1.6.0

#### Patch Changes

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

### 1.5.2

#### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

### 1.5.1

#### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

### 1.5.0

#### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

### 1.4.0

#### Minor Changes

- c4f563d: Production readiness fixes from the July 2026 full audit.

  - The `budgetUsd` ceiling now survives resume: the engine records it in `RunMeta.budgetUsd` and restores it on every resume, so the replayed spend counts against the original invocation's bound and `ResumeOptions` still exposes no way to raise it. Journals written before the field existed (or read through a store that drops optional `RunMeta` fields) resume uncapped, exactly as before; the conformance kit gains a round-trip check so custom stores cannot drop the field silently.
  - `spawn:rejected` and `resolution:applied` / `resolution:superseded` are now emitted: live admission rejections carry the rejection `code`, `agentType`, and the journaled decision `entryRef` (absent only for pre-admission config gates), and live resolution attempts report winning or losing the first-closing-wins fold. `spawn:admitted` now carries the decision `entryRef` and the admitting `verdict` arm. The `orchestrator:budget` union member now types the two payload shapes actually emitted; `journal:compat` stays declared but unemitted (the scan runs before a run's event stream exists) and its TSDoc says so.
  - `toOtel` implements real parent-child span nesting when `contextApi` and `setSpan` are passed; without them spans stay flat but attributed.

  - `'readonly'` isolation now compiles a deny rule for tools declaring risk `write` or `destructive` into the spawn's permission chain, exactly as the tools guide documents; read tools and other isolation modes are unaffected.
  - VCR `replay()` refuses a cassette recorded outside the engine's hashVersion support window (`[CURRENT-1, CURRENT]`) with a typed `ConfigError` instead of silently drifting; in-window cassettes replay as before.
  - `InMemoryStore` accepts `{ quiet: true }` to opt out of the durability warning, and the warning text now states the precise truth: nothing survives a process exit and cross-process resume is impossible (same-process resume of a kept instance works). `createTestEngine` constructs its store quietly, so the blessed offline tier no longer prints a misleading warning.
  - The bare `Date.now()` / `Math.random()` development warnings no longer blame workflow code for calls that originate in library internals (the engine's own retry jitter, provider SDKs): the retry jitter uses a natively captured `Math.random`, and the in-process guard skips callers that live under `node_modules`.
  - `rulvar run --profile` now applies the profile's per-role effort hints: entries in `defaults.routing` that carry no effort are seeded from `RunProfile.effortByRole` (an explicit host effort always wins; ladder entries and unrouted roles stay untouched).
  - `rulvar --help` documents the shipped `kb inbox` and `kb gate` subcommands.
  - The unscoped `rulvar` pointer package ships TypeScript declarations (`index.d.ts` with a `types` export condition), so strict TypeScript projects can import the bare name; the install smoke gate now packs and checks the pointer alongside the umbrella.

#### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

### 1.3.0

#### Minor Changes

- 969974f: rulvar kb inbox (M12-T03): aggregates kb_propose-born proposals from finished runs through the RunLedger fold behind the LedgerExport seam. Matching (subject, taskClass, polarity) triples group for display ONLY (the command writes nothing, authorizes no spend and schedules no sweeps); each proposal renders with full provenance (initiating run identity, proposal entryRef, lineage, tier, trigger, evidence refs) plus the typed template statement a gated claim would carry; proposals of runs finished more than fourteen days ago expire out of the view. This is the human review surface, so the quarantined note and concrete model names render here verbatim, exactly like kb list.
- 64aff88: rulvar kb gate (M12-T04, the closing task of ModelKnowledge phase 3): the human gate flow turning one inbox proposal into a human-editorial claim. The attribution attestation is mandatory by construction (without --ruled-out over the closed checklist the GateRecord does not assemble and nothing is written; contrast evidence rides --contrast-run or --contrast-eval); the born claim carries the typed template statement (never the quarantined note), origin provenance back to the proposing run and entry, evidence resolving into that run's journal, and the editorial TTL. The commit is CAS against the per-project rulvar.models.json, whose git review is the authenticating gate. Non-proposal entries, expired proposals (fourteen days from the run's terminal updatedAt), running runs and already-gated proposals reject with typed errors.

#### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

### 1.2.0

#### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

### 1.1.0

#### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

### 1.0.0

#### Minor Changes

- 93eae2c: M10-T04: `rulvar kb list` (docs/05, section "Read path"; docs/06, section 10.5). The second consumption path: claims of the per-project store (./rulvar.models.json) render with full provenance for the humans who author ladders, floors, and profiles: author and gate identity, evidence refs (journal seqs and eval reports), metrics when present, supersede chains, proposal origin, and the TTL state (holds or EXPIRED) per the docs/05 decay table. No run and no pin are involved, so the maintenance view names models verbatim; only in-run cards are nameless. The grammar members `kb inbox` (phase 3, M12) and `kb sweep` (phase 2, M11) fail loudly naming their phases until they ship.
- fef6263: M11-T05: `rulvar kb sweep` (docs/05, section "Grounding and decay"). Falsification sweeps run manually, from CI, or from a user cron, never engine-scheduled, configured by the `kbSweep` section of rulvar.config.mjs (committerId, the FIXED model pool, taskClass-tagged eval cases, optional thresholds and canary probes; @rulvar/evals loads dynamically like @rulvar/planner does for plan).

  - The falsification guarantee: the matrix is the configured pool UNIONED with every model carrying an active, unexpired negative claim, plus the re-measurement queue (expired active eval claims); the pool renders with each member's origin.
  - With canary probes configured, every pool member fingerprints BEFORE measurement and drift flips its eval claims to stale in place; the sweep then re-measures and commits threshold-crossing claims through the eval-committer identity, reporting cells, emitted claims, and the committed store version.

#### Patch Changes

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

### 0.9.0

#### Minor Changes

- 65c7b2c: M8-T01: createServer, the HTTP shell (docs/02 section 8.2; FR-702), plus the Engine.stores seam it stands on (docs/06 10.2, M8 entry amendment).

  - `@rulvar/cli`: `createServer({ engine, workflows })` returns `{ fetch(req: Request): Promise<Response> }` with the five canonical routes: POST /runs (start a registered workflow), GET /runs/:id (status and outcome), GET /runs/:id/events (SSE; Last-Event-ID maps to the event seq, replay is at-least-once and consumers deduplicate on `replayed`), POST /runs/:id/external/:key (programmatic resolution, `by: 'external'`; a run that settled suspended in-process auto-resumes; a run not live in this process gets the documented offline append under a lease where the store is leasable, and resumes on a worker), GET /runs/:id/cost (the settled in-process CostReport, or the pure journal fold priced by the optional `priceUsd`). Authentication stays host middleware (docs/14, OQ-16).
  - `@rulvar/core`: the Engine interface gains the readonly `stores` accessor exposing the configured journal and transcript stores; exactly the instances createEngine received (or defaulted), no store contract widens.
  - `@rulvar/testing`: `createTestEngine` forwards the new `stores` accessor.

- a2a3243: M8-T02: createWorker, the queue shell (docs/02 section 8.3; FR-703), plus the two queue seams it stands on (docs/06 10.2 and docs/03 12.3, M8 entry amendment).

  - `@rulvar/cli`: `createWorker(engine, { store: LeasableStore, concurrency? })` leases resumable and suspended runs via acquire/renew/release with fencing epochs (renew cadence ttl/3; Appendix A reference ttl 60000 ms; concurrency default 1). A store without lease capability is a typed ConfigError at start, never a silent split-brain; leasing a store other than `engine.stores.journal` is equally a ConfigError. DEF-6 repeats at acquire: a journal outside the hashVersion window releases the lease and poisons the run for this worker. Stateless workers call bare `engine.resume` with the lease; unchanged suspended runs are skipped until their journal grows; queue semantics stay honestly at-least-once with deduplication by the journal. The OQ-21 residual (original in-process args are not journaled) is bridged by the optional `argsFor` hook.
  - `@rulvar/core`: `ResumeOptions.lease` carries the worker's lease through the kernel's single append site, so a stale writer's appends are rejected by the fencing epoch and never become visible (lease theft impossible by construction); bare `engine.resume(runId)` now falls back from the persisted CompiledWorkflow source to `defaults.workflows[workflowName]` (the registry the queue worker resolves through, docs/06 10.4); the Replayer accepts the lease option.

- f920013: M8-T03: the multi-process seam soak and the queue-failover-during-forced-finish cassette (the DEF-7 final cassette; docs/09 sections 6.9 and 6.10; docs/10 section 3.9 exit criteria).

  - `@rulvar/plan`: the public `runQueueFailoverDuringForcedFinish` cassette runner: worker A loses its lease strictly between the cap decision and the final wake; worker B reclaims with a bumped fencing epoch and rolls the forced finish forward. The stale writer's appends are rejected and invisible, exactly one cap decision exists, finalization is paid once. The LeasableStore is injected (`QueueFailoverDeps.makeStore`) so the package stays core-only; the replay test and the record script supply the reference SqliteStore.
  - `@rulvar/cli`: the multi-process-fencing-soak harness: two workers over one SqliteStore file with kill/failover across the suspension, plan-revision, and forced-finish boundaries; every round asserts zero split-brain and zero double pay. Worker hardening: a failed renew now frees the concurrency slot immediately (a stale run whose landings all reject may never settle; fencing, not the stale process's cooperation, protects the journal).
  - Repo: `cassettes/queue-failover-during-forced-finish.json` recorded and frozen (double-run agreement; `scripts/record-m8-cassettes.mjs`); the queue-mode limitation stays documented (no distributed cross-process rate limiter, EXC-14/OQ-17).

- ebc8101: M8-T04: the redaction and retention interim rules executed (docs/14 OQ-20 and OQ-22; docs/09 section 8 rewritten to the executed state; docs/03 12.4 and 12.8; docs/06 10.1 and 10.2 amendments).

  - `@rulvar/core`: the L0 SerializationHook (`createEngine({ serialization })`): redact/encrypt at the append/put boundaries, symmetric on load/get, applied by wrapping the stores so `Engine.stores` exposes the one policy point; kernel ordering fields are drift-checked with a loud ConfigError. Default key masking at the telemetry boundary: every emitted WorkflowEvent passes `maskSecrets` (provider keys, PATs, bearer tokens, JWTs, private-key blocks become `[masked-secret]`); opt out via `redaction: { maskEvents: false }`; never touches the journal. Retention: `TranscriptStore.delete(ref)` joins the SPI (missing ref is a no-op; InMemory and File stores implement it), `Engine.deleteRun(runId)` cascades blob deletion before the journal (no orphan transcripts), and `Engine.pruneRun(runId)` deletes checkpoint blobs of ok-terminal attempts that nothing else references (parked, cancelled, escalated, and hanging attempts keep theirs).
  - `@rulvar/cli`: `createServer` and `createWorker` take the opt-in `retention` predicate over RunMeta (the server applies it at terminal settles, the worker during sweeps under a brief lease); the OTel exporter masks string span attributes with the same policy, defense in depth over the already conservative attribute content policy.
  - `@rulvar/testing`: `createTestEngine` forwards `deleteRun`/`pruneRun`.

#### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

### 0.8.0

#### Patch Changes

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

### 0.7.0

#### Minor Changes

- 10b45f1: M6-T11: the rulvar plan command and the M6 gating cassettes. `rulvar plan "<goal>" [--dry-run]` (the canonical grammar) loads @rulvar/planner DYNAMICALLY (the CLI's static dependency stays @rulvar/core; a missing install is a clear error), plans against the host-config engine, prints the accepted script plus its advisory diagnostics, and runs it in the worker sandbox unless --dry-run. The three docs/09 6.10 gating cassettes are recorded on the FakeAdapter and committed under the frozen-fixture lock with exported scenario builders shared by the recorder script and the replay tests: sandbox-determinism (two fresh runs of one CompiledWorkflow produce byte-identical normalized journals matching the cassette), planner-self-repair (the failing draft round-trips through the JSON-diagnostics repair, re-planning from the committed journal is free, and the accepted script executes deterministically in the sandbox), and orchestrator-crash-resume (the committed pre-crash journal plus boundary checkpoints resume with zero re-paid spawns, no duplicate spawn decisions, and byte-stable handles).

#### Patch Changes

- 9f000a7: Drop the @rulvar/planner peer declaration from the CLI: the plan command loads the planner DYNAMICALLY and reports a clear error when it is not installed, and a workspace peer dependency would major-cascade the whole fixed group on every planner bump under the changesets peer-dependents rule (0.6.0 would have released as 1.0.0 instead of 0.7.0).
- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

### 0.6.0

#### Minor Changes

- fa05007: M5-T01 workflow registry and the @rulvar/cli base.

  - `@rulvar/core` gains the per-engine `WorkflowRegistry` type and
    `defaults.workflows` on createEngine (docs/06 section 10.4): an
    explicit first-class value, no module-level registry; shells resolve
    by-name runs against it (ctx.workflow's string form arrives M6, the
    queue worker M8).
  - Spec-conformance fix: the M4-T09 quality floors option moves from the
    createEngine top level to its canonical home `defaults.roleFloors`
    (docs/06 section 10.1). Update `createEngine({ floors })` call sites
    to `createEngine({ defaults: { roleFloors } })`.
  - `@rulvar/cli` ships its first real surface: the canonical grammar
    `rulvar run <file|name> [--args JSON] [--store PATH] [--budget-usd N]`,
    `rulvar resume <runId> [--args JSON] [--store PATH]`,
    `rulvar runs ls [--store PATH]`, `rulvar inspect &lt;runId&gt; [--store
PATH]` (no aliases), a line-oriented TUI progress renderer over the
    event stream, and interactive resolution of suspended approvals and
    externals (EOF leaves the run suspended, never errors). Engine
    assembly follows the host-config convention: `rulvar.config.mjs`
    default-exports `{ engineOptions?, workflows? }`, a workflow module
    may export `workflow`/`engineOptions`/`workflows`, and --store selects
    the JsonlFileStore directory (default `.rulvar`), so the CLI itself
    depends only on @rulvar/core. The `rulvar` bin is included; the
    resume/inspect grammar amendment (--args re-supply, --store symmetry)
    is recorded in docs/06 section 10.5.

- 9234dc8: M5-T03 cost reports. The CostReport builder moves to its own module
  (`engine/cost-report.ts`) and report totals become the LEDGER FOLD
  totals at settle: RunOutcome.usage and cost.totalUsd are computed from
  the journal's terminal entries (the same summation the kernel budget
  seed uses), so report totals equal ledger fold totals exactly, live and
  across resume, by construction. The new `costReportFromJournal(entries,
priceUsd)` is the pure fold for STORED runs: byModel and totals from
  terminal servedBy with abandoned subtrees contributing zero; phase,
  agentType, and role attribution are live-run facts that entries do not
  carry (byRole and the orchestrator block complete in M7 per DEF-7).
  Unpriced models keep surfacing, never as silent zeros. `rulvar inspect`
  gains the cost view (total, byModel, unpriced) over the config-assembled
  price function (table wins over caps.pricing), and live run output
  prints the byModel/byPhase buckets.
- 8a41656: M5-T07 RunProfile presets and M5-T08 OTel exporter.

  - `engine/run-profiles.ts`: `RUN_PROFILES` (fast/standard/deep/ultra) and
    `runProfile(name)` ship the presets as pure DATA, bundles of per-role
    effort hints, per-run concurrency, budget, permission preset, and
    spawn limits, with no functions and no named model strings (named
    strong defaults stay in the umbrella). They are never engine
    semantics: a source-scan test asserts the engine has zero branches
    keyed on profile names. `rulvar run --profile <name>` applies the
    chosen profile UNDER the host's own engine options (host always wins;
    the engine then sees only ordinary options), compiling the profile's
    permission preset into the engine deny/ask layers as data.
  - `@rulvar/cli` gains `toOtel(run, tracer)`: it maps a settled run's
    spanId tree 1:1 onto OpenTelemetry spans (run > phase > agent > tool >
    child), with rulvar.* and gen_ai.* attributes, start/end timestamps
    from the lifecycle events, and payload-only events attached as span
    events. Prompts, completions, and tool payloads are NEVER exported;
    replayed events never create duplicate spans. `@opentelemetry/api`
    ^1.9 is an optional peer dependency and the exporter is typed against
    a minimal structural TracerLike, so an absent OTel package never
    breaks the CLI.

#### Patch Changes

- 5c8865d: M5 exit criterion coverage: prove the CLI works end to end against
  SqliteStore, not only JsonlFileStore (docs/10, section 3.6). A host
  config that supplies a SqliteStore as `engineOptions.stores.journal` is
  honored by the CLI's engine assembly (JsonlFileStore is only the default
  fallback), so run/suspend, runs ls, resume, and inspect all round-trip
  against sqlite through the same command paths. Added as a CLI e2e test.
- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

### 0.5.0

#### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

### 0.4.0

#### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

### 0.3.0

#### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

### 0.2.0

#### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

#### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0

## @rulvar/compat

Independently versioned (docs/12, section "Exemptions"): releases are
deliberate manual events, never lockstep bumps; this changelog is
maintained by hand.

### 0.1.1

- Packaging only: the published artifact now ships a README (purpose,
  install, `extraDerivers` usage, documentation links). `dist` is
  byte-identical to 0.1.0; no profile, export, or contract changed.
  The immutability manifest re-freezes on 0.1.1 after publish
  (`node scripts/compat-immutability.mjs --update`).

### 0.1.0

- M2-T05: extraDerivers plumbing plus the synthetic hashVersion 0
  deriver for the reject-version-too-old cassette. No real profile has
  aged out of the support window yet.

## @rulvar/core

### 1.44.0

#### Minor Changes

- 299f7d2: Evidence preservation contract for the orchestrator finish (the improvement plan's RV-202 slice). The finish validation input now carries `children`: every spawned child at finish time, in spawn order, with its handle, nodeId, status, and full output text, a pure read of the durable state the orchestrator already tracks, so validators can hold the finish result against the evidence the children actually produced. The new `evidencePreservedValidator` enforces the plan's gate: at least `minShare` (default 0.95) of the distinct citations found in the outputs of children settled ok must appear literally in the result text, with the missing ones listed in the rejection so the bounded repair turn can restore them; `requireKnown: true` additionally rejects citations no child ever produced, closing the fabrication path that satisfied a plain count check. Purely textual and deterministic; verdicts journal exactly like every finish validation verdict, so replay and resume reproduce them without re-running validator code.

### 1.43.0

#### Minor Changes

- 71b7181: Deterministic finish validators with bounded repair for the dynamic orchestrator (the improvement plan's RV-204 slice). `OrchestrateOptions.finishValidation` runs host validators over every schema valid `finish({ result })` call: a rejection returns the failure reasons to the model as the call's error tool result and grants a bounded repair turn (`maxRepairs`, default one); a rejection past the bound fails the run with the typed `FailRunError` (code `fail_run`, `data.source` `'orchestrator_finish_validation'`) BEFORE the acceptance settle, so acceptance never judges a rejected finish. Every verdict journals as a decision entry keyed by the finish call id, so a resume rolls the same verdicts forward without re-running validator code, and a journaled final rejection short circuits at boot without a model call. The toolset never changes and zero configuration adds zero journal entries, so existing runs and frozen cassettes replay byte for byte. Ships `requiredSectionsValidator`, `requiredFieldsValidator`, and `minMatchesValidator`, plus the `FinishValidator` contract for custom checks.

### 1.42.0

#### Minor Changes

- 9b70f27: Add the opt in child-result evidence tools get_child_result and read_child_artifact (the v1.40.0 improvement plan, narrow RV-201 slice)

  The digest an await returns is a wake signal truncated to 400 characters, so
  an evidence-heavy child settles with its findings intact in the journal but
  only a snippet in the digest, and until now there was no way for the
  orchestrator to fetch the rest. OrchestrateOptions.exposeChildResultTools now
  adds two pure read tools. get_child_result pages a settled child's FULL
  output (its string or JSON; a failed child's error message, so the
  orchestrator can read why it failed), reporting totalChars and hasMore and
  clamping maxChars to 20000 per call so one read can never flood the
  orchestrator context. read_child_artifact pages a settled child's artifact
  content by id: inline data, an offloaded transcript blob decoded as UTF-8, or
  a patch's changed-file list.

  Both are pure reads of already-durable journal state, so a resume reproduces
  them with no new spend. The option is off by default: adding the tools
  changes the orchestrator toolset hash by design (exactly like the extension's
  plan tools), so a run that does not opt in keeps the default toolset, and
  every frozen cassette, unchanged.

### 1.41.0

#### Minor Changes

- be589ec: Add the orchestrate acceptance policy and the CLI --strict flag (the v1.40.0 improvement plan's completion contract)

  Run status ok proves that finish validated, and nothing more: the model may
  call finish after any mix of child outcomes, so ok alone never proves the
  children succeeded. The new opt in OrchestrateOptions.acceptance turns that
  into a checked contract. childPolicy 'all-ok' requires every spawned child to
  have settled ok when finish validates (a child still running counts against
  it); { minSuccessful: N } tolerates failures beyond the first N successes.
  The verdict is journaled as one decision entry, so a resume rolls the same
  verdict forward, immune to drift of the live options. An accepted result
  becomes the acceptance envelope { result, completion, childStatusCounts,
  degradedReasons }; a violated policy fails the run with the typed
  FailRunError (code fail_run, data.source 'orchestrator_acceptance') instead
  of settling ok. Without acceptance nothing changes: the result value stays
  the raw finish payload and no new journal entry is written.

  The CLI pairs with the envelope: rulvar run --strict and rulvar resume
  --strict exit nonzero when a settled ok value reports completion 'partial',
  printing the degraded reasons (strictExitCode is exported for hosts). The
  guides also now state the adjacent contracts plainly: await_any and await_all
  return truncated TaskDigests rather than full child reports, cost totals are
  price registry estimates with usageApprox marking estimated usage, the
  fencing epoch covers journal appends while RunMeta and transcript blobs stay
  advisory projections, and data protection at rest is owned by the host.

### 1.40.0

#### Minor Changes

- cf33550: Fence the offline resolution append and surface approximate usage (v1.39.0 review)

  The CLI server's offline resolution path acquired a store lease but never
  threaded it into the Replayer, so the resolution append ran unfenced: if the
  process stalled past its lease ttl and a queue worker took the run over, the
  stale append could land alongside the new owner's writes. The append now
  carries the acquired lease, so a superseded owner is rejected with
  LeaseHeldError (HTTP 409) instead of racing the current owner.

  Approximate usage is now visible where the run is reported. usageApprox rides
  the agent:end and run:end events and the CostReport, and the CLI cost line
  marks an estimated total, so a total that includes usage estimated after a
  transport cut, a ceiling that severed a stream, or an abort is never shown as
  though it were the exact provider charge. The field is present only when true,
  so every exact usage report and event is byte for byte unchanged.

### 1.39.0

### 1.38.0

### 1.37.0

#### Minor Changes

- e6b1481: Validate the persisted `KnowledgeSnapshot` on every `FileModelKnowledgeStore` read (v1.36.0 review P2-6). The old read checked only that `version` was a number, `hash` a string, and `claims` an array, so a hand edited or torn `rulvar.models.json` could forge a negative or fractional `version` and a mismatched `hash`, and a `null` or partial claim flowed on to crash the card render with an untyped `TypeError`. The read now requires a nonnegative integer `version`, a lowercase sha256 `hash` that MATCHES `knowledgeHash(claims)`, and structurally sound claims (a persisted snapshot may hold non active statuses), refusing any inconsistency as a typed `ConfigError` that names the offending path. `commit` reads first, so it refuses to append onto a corrupt base.
- e6b1481: Contain `FileTranscriptStore` refs under their configured root (v1.36.0 review SEC-P1). The per-segment check accepted `.` and `..` (dots are in its alphabet), so `join` let a `..` segment escape: a caller passing an untrusted ref to `put`, `get`, `list`, or `delete`, or an untrusted `runId` (which prefixes the checkpoint and workflow source refs), could read, write, or delete `.bin` files outside the directory. Every segment now must be a nonempty safe token that is neither `.` nor `..`, and the resolved path must stay under the resolved root. The engine also refuses an unsafe `runId` with a typed `ConfigError` before its first store write, so a compiled run cannot persist its source outside the transcript root.

### 1.36.0

#### Minor Changes

- 101795b: Fix the v1.35.0 review P1 and the core P2 groups. The parked flavor B decision wait is abort aware: `handle.cancel()`, a `RunOptions.signal` abort, the run `deadlineAt`, and fail fast sibling aborts settle the run in bounded time instead of waiting out the escalation deadline; the suspension entry stays open so resume re parks it, worktree salvage still precedes destruction, and the wait rejects with the new `EscalationDecisionAbortedError`. `budget.atCap: 'fail-run'` is executable: the journaled cap decision drives the branch, the reserved finalizer is skipped, and the run fails with the new `FailRunError` (registry code `fail_run`), rolled forward deterministically on resume. `OrchestrateOptions` validate at construction (`maxSpawns`, `renderBudgetChars`, `budget.capUsd`, `budget.capFraction`, `budget.finalizeReserveUsd`, `budget.finalizeTurns`, and the `atCap` literal), and the digest render budget is a hard upper bound of the rendered row, marker included, at both distillation tiers. The extension seam gains an optional `terminate` capability so a journaled policy verdict can close the run typed. Knowledge and isolation intake validate too: `FileModelKnowledgeStore.activeClaimsCap`, `GitWorktreeProvider.maxPinnedWorktrees`, and `modelKnowledgeCard` `budgetChars` (now a hard bound of the whole card). The sweep also validated `escalation.minSpendUsd` (a NaN silently disabled the minimum spend gate) and gave `LeasableStore` the optional readonly `leaseTtlMs` capability.

### 1.35.0

#### Minor Changes

- d4ac3bf: Validate every numeric engine option at its intake and survive far future deadlines (v1.34.0 review P2-1, P2-2, P2-3, P2-4). `createEngine` now refuses malformed `concurrency.perRun` and `concurrency.perProvider` caps, `budgetDefaults` fields, engine and profile `limits`, profile `estCost`, escalation `deadlineMs`, and compaction thresholds with a typed `ConfigError`; `engine.run` validates `budgetUsd` and `limits` synchronously and requires `deadlineAt` to be an ISO 8601 date-time with an explicit UTC designator or offset (an impossible calendar day is refused rather than silently rolled into the next month, and a malformed string no longer cancels the run after the first provider dispatch). `ctx.agent` validates `estCost` and `limits` per call, so a negative reserve can no longer shrink the committed total and admit a sibling past its ceiling, and the admission gate refuses a non finite reserve as a backstop. The per run semaphore requires a positive integer limit (a NaN cap used to park the first request forever with `cancel()` unable to settle the run) and queue waits are abort aware, so a cancelled run always drains its queued calls in FIFO order. Absolute deadlines (`RunOptions.deadlineAt` and the journaled escalation deadline) are honored through sliced timers beyond the Node timer maximum instead of firing immediately, while `streamIdleTimeoutMs` is bounded by that maximum like retry policy delays. `validateUsageLimits` is exported for hosts that want the same check at their own boundary.

### 1.34.0

#### Minor Changes

- f1505ec: `mcp()` now returns a `McpToolSource`: the frozen `ToolSource` seam plus an idempotent `close()` that releases everything the source created on first use, the SDK client, its transport, and, for stdio, the spawned child process. Without it a one shot host that ran a workflow over a stdio MCP server could never exit naturally, because the child and its pipes kept the event loop alive (v1.33.0 review P2). `close()` resolves even when the connection never succeeded, and it resets the source, so a later `tools()` call connects afresh; a failed connect now also releases its transport and child on the way out instead of leaking them behind the error it rethrows. The engine still never closes a source, because one source may serve many runs: the host owns the lifecycle, and the MCP guide documents the `try/finally` pattern for one shot scripts. Real stdio and streamable http integration tests now cover both external transports, including child process release, reconnect after close, and cleanup after a failed connect.

### 1.33.0

### 1.32.0

### 1.31.0

### 1.30.0

#### Minor Changes

- 87ce985: Validate every RetryPolicy before anything runs under it (v1.29.0 review P2). Published 1.29.0 accepted `attempts: 0`, fractional and NaN attempts, negative backoff numbers, and a NaN factor, then dispatched the adapter under them: the invalid values silently reshaped retry semantics (zero or NaN attempts behaved as no retries; a negative initialMs or NaN factor collapsed the delay to zero, removing backoff entirely). The new exported `validateRetryPolicy` enforces the documented contract, a positive safe integer `attempts` (the engine always makes the first try, so zero attempts has no meaning), timer safe integer `initialMs` and `maxMs` (`maxMs` below `initialMs` stays legal as a `Math.min` ceiling), a finite positive `factor` (below 1 is a legal decaying backoff), a boolean `jitter`, and unique known `retryOn` classes, and throws a typed `ConfigError` naming the offending field and its config source. `createEngine` validates `defaults.retry` and every profile retry at construction; the per call merge in `ctx.agent` validates the winning policy before identity, admission, or any journal append, so an invalid policy can never reach a provider or record a partial agent execution.

### 1.29.0

#### Minor Changes

- 621d566: Make the retry and failover backoff interruptible and validate every provider supplied retry delay (v1.28.0 review P1 and P2).

  The retry engine now races its backoff wait against the host cancel signal (which the run deadline also drives) and the budget ceiling signal: an abort wakes the wait immediately, settles through the canonical aborted outcome (`cancelled` or `exhausted`, with every already recorded usage kept), and forbids every further dispatch, including the one behind a keyed limiter queue, so an adapter that ignores its signal can no longer be re entered after an abort. Previously a provider supplied `retryAfterMs` armed an uninterruptible sleep: a cancel, a crossed deadline, and a crossed budget ceiling all waited out the full backoff and the adapter was dispatched again. The injected `retry.sleep(ms)` test hook keeps its signature; a hook that loses the race is abandoned without an unhandled rejection, and the native timer path clears its timer so an abandoned long backoff never pins the event loop.

  `retryDelayMs` is now the defensive boundary the docs promise: only a finite nonnegative provider `retryAfterMs` replaces the computed delay, anything else (NaN, Infinity, a negative) is ignored as adapter noise, and every returned delay is a finite nonnegative integer clamped to the Node timer maximum, so a malformed or huge value can never arm an instant or overflowing timer. Both first party adapters stop emitting unvalidated `Retry-After` parses: an unparsable header (the HTTP date form included) omits `retryAfterMs` entirely instead of producing NaN (which also broke the `WireError.data` Json invariant by serializing to null), and a huge but finite value is clamped. The `mapAnthropicStream` TSDoc now states precisely how a truncated stream is reported (the `finished` flag on the return value, with the adapter synthesizing the terminal error).

  Four frozen fixture cassettes are refrozen for this release (the hashVersion-bump refreeze ceremony applies; hashVersion itself is unchanged and existing journals replay identically): in three cap freeze scenarios the main orchestrator entry now honestly settles cancelled at the cap instead of paying one more ordinary turn whose result the forced finish machinery discarded anyway, and one scenario loses a post abort wait suspension that can no longer be dispatched. Entry identities, keys, and every other row are byte identical.

### 1.28.0

#### Minor Changes

- d98eb0b: Enforce the terminal stream contract end to end (v1.27.0 deep E2E review P1 and P2). The runtime now fails closed when an adapter stream drains without a terminal `finish` or `error` event: the partial turn becomes a retryable transport fault that feeds the ordinary retry and failover machinery instead of settling as `ok` with truncated text, and a requested abort (cancel, budget ceiling, idle severance) remains a clean end with no fabricated provider error. Consumption stops at the first terminal event, so events after `finish` can no longer mutate the value, revise the authoritative bill, or trigger tool execution. The first party adapters enforce the same contract at the wire: the Chat Completions mapper no longer synthesizes `finish: stop` when the stream is cut before a `finish_reason` (usage the provider did report is still forwarded, half assembled tool calls are dropped), the Responses mapper fails closed on EOF without a response terminal event, and the Anthropic adapter surfaces a read cut before `message_stop` as a retryable transport error and no longer converts a caller requested abort during `messages.create()` into a terminal error. `mapResponsesStream` and `mapChatCompletionsStream` accept an optional `signal` so a requested abort keeps ending the stream without a terminal event. The VCR `record` wrapper now commits its cassette row even when the consumer stops reading at the terminal event (the engine always does now); adapter middleware must not rely on being drained past the terminal. The committed `combined-loop-descent` catalog cassette is refrozen because stopping consumption at the terminal shifts the deterministic interleaving of two parallel plan children by one scheduler turn; entry content, keys, and the actual `hashVersion` are unchanged, journals recorded under earlier versions replay unchanged, and this changeset carries the frozen fixture gate's hashVersion-bump ceremony token only to unlock that refreeze.

### 1.27.0

#### Minor Changes

- 884a433: Types referenced by public signatures are now exported from their package barrels, so the API docs resolve them instead of carrying known incomplete references (v1.26.0 deep E2E review): `BaseAppend` from `@rulvar/core` (the fields common to every `Replayer` append), `Block` and `MappedStop` from `@rulvar/anthropic` (the wire level content block alias and the stop reason mapping), and `VcrHeader` from `@rulvar/testing` (the first line of every cassette file). The frozen TypeDoc baseline shrinks from eleven entries to the four vendored Standard Schema notices.

### 1.26.0

#### Minor Changes

- a4fc757: Scale fixes from the v1.25.0 review. `RunHandle.events` keeps its gapless contract (buffered from handle creation) but drains linearly: the iterator queue uses a head index with in place compaction instead of `Array.shift()`, so a late read of a 100k event backlog takes milliseconds instead of seconds, and delivered events are released eagerly. `engine.pruneRun` now collects exact whole string references in one recursive pass over the journal (values and object keys) instead of a per terminal substring scan: a checkpoint ref that is a prefix of another (`ckpt/2` inside `ckpt/20`) no longer survives pruning, matching what the stores and durability guides always promised, and the scan is linear in journal size instead of quadratic in entries. New optional store capability `MetaLookupStore.getMeta(runId)` with the `hasMetaLookup` guard and the `readRunMeta` helper: `engine.resume` and every shell point lookup use it when present and fall back to the historical `listRuns` scan otherwise; all three shipped stores implement it and the serialization wrapper preserves it. `RunFilter` gains an advisory `statuses` array (match any, combining with `status` as either matches; the shared predicate ships as `metaMatchesFilter`). `RunMeta` gains `genesis`, a generation token minted at the fresh start and preserved verbatim across resume segments, so a `deleteRun` and recreate of the same explicit runId is distinguishable from the original run.

### 1.25.0

### 1.24.1

#### Patch Changes

- 0bb14db: Correct the `RunMeta.argsHash` documentation (v1.24.0 review P2-2). The digest is a deterministic, unsalted SHA-256 over the JCS form of a run's genesis args, so it reveals when two runs shared identical args and low-entropy args (a boolean, an approval flag, a role, a short id) are recoverable by hashing candidate values. The TSDoc on `RunMeta.argsHash` and `hashRunArgs` no longer claims that nothing sensitive lands in meta; it now states the digest is sensitive-derived metadata that confers no confidentiality and must be access-controlled like the journal and transcripts. The raw args are still never journaled, and no runtime behavior changes.

### 1.24.0

#### Minor Changes

- 2b033e8: Record the genesis args binding in RunMeta and make the dry-run preview mutation-free (the v1.23.0 review). `RunMeta` gains `argsProvided` (whether the run started with defined args) and `argsHash` (sha256 over the JCS canonical serialization of the genesis args, never the raw value), written by the engine at genesis and preserved verbatim by every resume segment, so hosts can refuse a resume whose re-supplied args silently diverge from the original invocation; the new public `hashRunArgs()` derives the same hash host-side. Legacy metas never gain the marker retroactively, and unserializable args record presence without a hash. A `dryRun` resume now performs ZERO store mutations by invariant: `putMeta` is skipped entirely (no status flip, no `segments` bump), the compiled-source blob is not re-put, and the Replayer's single append site refuses any journal append under replay-strict with a typed `JournalMissError`. The store conformance kit checks the round-trip of both new fields.

### 1.23.0

#### Minor Changes

- 1f9c272: Resume correctness and telemetry integrity, the v1.22.0 review's two P1 findings plus the event-layer P2s.

  - **Resume ordinal continuation (P1-1).** Since M2, the ordinal map key minted for new operations and the key used to seed that map from prior entries on resume were built by two hand-written composites whose separators differed, and the minting one contained an INVISIBLE literal NUL byte in the source, so the seeding filled a bucket `mint()` never read. Every identical-identity live operation after any resume re-minted ordinal 0, duplicating the journal identity triple `(scope, key, ordinal)` and corrupting sibling binding on the next replay. Both sites now go through one `ordinalMapKey` helper (escaped `U+0000` separators, no printable-separator aliasing), the seeding computes an order-independent max, and the regression suite covers identical siblings across suspend, process recreation, and replay-strict re-resume. No `CURRENT_HASH_VERSION` change: ordinal bookkeeping never entered content-key derivation, and journals written by broken versions still load (their ordinals seed the map exactly as recorded).
  - **Event `seq` and `spanId` durability across segments (P1-2).** Every resume segment restarted the telemetry counters at 0, so one `runId` repeated `seq: 0` and `spanId: 's0'` per segment, against the documented per-run contracts, and the CLI SSE `Last-Event-ID` cursor became ambiguous. `RunMeta` gains an optional `segments` count, bumped durably at every segment start strictly BEFORE the segment's first emission (crash-safe: a killed segment still advanced it), and each segment seeds `EventBus` and `SpanRegistry` at `segments * EVENT_SEGMENT_STRIDE` (exported, informational). `seq` stays a plain number, strictly increasing across the whole run and NOT contiguous across segments; span ids never repeat. Stores must round-trip the new field (the conformance kit now checks); a store that drops it degrades telemetry counters to per-segment, never the journal.
  - **Listener-failure ordering and masking (P2-1).** The v1.22.0 subscriber-isolation warn was delivered mid-fan-out (observers saw it BEFORE the event that caused it, with descending seq) and was built outside the masking boundary (a key-shaped fragment of the listener's error reached observers raw). The warn now goes through the ordinary `emit()` after the triggering event's fan-out completes: masked like every event, seq stamped at delivery, `[event, warn]` order on every surface, still at most once per bus and recursion-proof.
  - **Spawn admission events on every boundary (P2-5).** `spawn:admitted` only ever fired from the dynamic orchestrator's spawn tools; `ctx.agent` lineage admissions and `ctx.workflow` child admissions emitted nothing (`ctx.workflow` not even `spawn:rejected`). All admission boundaries now emit both events through one helper; journal-recovered decisions re-announce with `replayed: true` when they take effect, and a cleanly replayed dispatch does not re-announce. `spawn:admitted.spawnUnitsAfter` is now optional: absent on lineage-layer admissions, whose spawn-unit debit rides the dispatch itself.
  - **The replayed flag actually reaches observers.** The engine's internal event sink dropped the third argument of `emit`, so every `replayed: true` marker (replayed agent and tool lifecycle events, recovered suspensions, recovered rejections) was silently stripped since M2 and rendered as live. The sink now forwards it; the documented replay re-emission table is true again.
  - **`SANDBOX_AGENT_OPT_KEYS` exported.** The sanctioned sandbox agent-option allowlist is a documented public constant, the single source for the runtime validator and the planner API card.

### 1.22.0

#### Minor Changes

- 77b554f: Add `sanitizeTerminalText`, the rendering-boundary counterpart to `maskSecrets`: it neutralizes terminal control sequences and control characters in one untrusted string so a provider error message, tool name, model id, or log line can never inject a control sequence or a second physical line into a rendered terminal line (v1.21.0 review P2-1). After sanitization the result carries no C0 control, no `DEL`, no C1 byte (including every 8-bit escape-sequence introducer), and no ESC-initiated CSI/OSC/DCS sequence; control runs collapse to a single space and visible text is preserved. The bundled renderers use it internally, and it is exported for host terminal sinks.

  Also isolate event-bus subscribers: a throwing `on()` listener (a renderer, a metrics hook) is best-effort telemetry and can no longer propagate out of `emit` to disrupt a paid run; the failure surfaces once as a warn log on the same bus instead (v1.21.0 review follow-up).

### 1.21.0

#### Minor Changes

- 7ee42a0: Enforce the financial-telemetry invariant at the adapter boundary for every adapter, injected clients and mocks included (v1.20.0 review P1-1). Every canonical token count must be a finite nonnegative integer with the cache subsets inside the full input; a violation fails the call loud as a typed transport-class terminal while accounting sees only conservatively sanitized values (garbage floors to zero, fractions round up, so a repaired charge is never an undercharge and never a credit). Both inlets are guarded: finish usage and mid-stream usage deltas, which previously reached the budget with no clamp at all. New exports `usageViolations`, `sanitizeUsage`, `sanitizeUsageDelta`, `snapshotUsage`, and `sanitizeTokenCount` carry the shared rules; the accounting boundaries snapshot adapter-owned usage objects before validating them, mid-stream deltas are repaired per field without the whole-usage subset rule (partial increments legitimately carry cache counts alone), counts are bounded to the safe integer range, mid-stream reports the finish total does not confirm fail the call loud with over-reported cache reads re-debited conservatively at the input rate, a duplicate finish or a post-finish usage event is refused, checkpoint restores sanitize the persisted counts exactly like the resume seed, and every cost fold treats a NaN or negative priced amount as unpriced instead of poisoning the totals. RunBudget grows defense in depth behind the validator: hostile priced amounts clamp to zero with a one-time error event, `spentUsd` stays finite and monotone under fuzzed hostile usage, and NaN or negative ceilings and resume seeds reject up front as `ConfigError` instead of silently disarming every comparison. Journal entries also gain the optional policy field `usageSemantics` (adapter-declared, never identity), and resuming a journal whose unstamped OpenAI entries carry cache writes emits a one-time `RULVAR_LEGACY_CACHE_SEMANTICS` warning pointing at the audit procedure (v1.20.0 review P1/P2-2).

### 1.20.0

#### Minor Changes

- 9367030: `CostReport.byRole` now attributes every paid invocation phase to its own bucket. Usage accumulates by (invocation role, serving model): `UsageSlice` gains an optional `role`, terminal entries and turn-boundary checkpoints persist the roled slices, and both the live buckets and the pure journal fold bump `byRole` per priced slice, so a routed finalize, a separate extract, or a mid-loop compaction summarize lands under `finalize`/`extract`/`summarize` even when one model serves several phases of one agent (previously the whole entry folded under its single primary role and those documented buckets could never be nonzero). Backward compatible end to end: slices without a role and entries without slices fold under the entry's primary `costAttribution.role` exactly as before, pre-split checkpoints restore under the primary pair, a single-phase single-model call still writes no slices (those journals stay byte-identical), and role buckets and model buckets both sum to the same total on live runs, same-engine replay, and fresh-engine replay.

### 1.19.0

#### Minor Changes

- 8cc9a9c: The finalize synthesis invocation now appends a deterministic synthesis instruction (`FINALIZE_SYNTHESIS_INSTRUCTION`, exported) to its request, and a non-truncated empty synthesis falls back to the loop turn's text instead of erasing it. Previously the routed finalize call sent the projected transcript ending at the assistant message with no instruction at all; a real model reads that as a fresh conversation opening, and its greeting unconditionally replaced the loop's correct answer as the schema-free output (reproduced live: a tool loop that had already answered `42` returned `How can I help?`). The instruction is request-only: the durable transcript keeps the raw history, so journal identity, extract input, and replay are untouched, and no recorded fixture moves. The truncated-empty synthesis case stays a bounded `output-truncated` failure. An opt-in live smoke (`RULVAR_LIVE_TESTS=1` plus `OPENAI_API_KEY`) pins the contract on a real provider.
- 8cc9a9c: `orchestrate(engine, goal, opts?, runOptions?)` and `orchestratePlanned(engine, goal, opts?, runOptions?)` accept the created run's `RunOptions` as an optional fourth argument, threaded verbatim to `engine.run`. `runOptions.budgetUsd` is the ROOT hard ceiling over the whole tree (the orchestrator and every child), immutable after start and frozen into `RunMeta`, while `opts.budget` only shapes the orchestrator's own sub-account inside that ceiling; the two layers were previously conflatable, and the canonical shortcuts could not set a root ceiling (or signal, runId, limits, deadline) at all without dropping to `engine.run(makeOrchestratorWorkflow(goal, opts), undefined, runOptions)`. Purely additive; existing calls are unchanged, and a call without `runOptions` still starts an UNCAPPED run, which the docs now state explicitly.

#### Patch Changes

- 8cc9a9c: Internal real-time reads bind the wall clock at module load, never the live global, eliminating false `RULVAR_BARE_DATE_NOW` warnings for consumers whose rulvar frames live outside `node_modules` (workspace dists, monorepo checkouts). Two composing defects: `createEngine` captured `Date.now` per call, so an engine created after a previous run had installed the dev-mode patch bound the PATCHED wrapper as its real clock (its `EventBus` then warned from the engine's own frames), and the ULID factory read the live global at every mint, so ids minted mid-run (the orchestrator extension IO, PlanRunner revisions, adapter id maps) routed through the patch too. The engine now uses a module-load `realNow` binding (module load always precedes the first patch install), the vendored ULID factory defaults to its own module-load clock, and `@rulvar/store-sqlite` follows the same convention. The dev-mode guard itself is untouched and stays exactly as sharp for workflow code, which keeps reading the live global.

### 1.18.0

#### Minor Changes

- 943962d: Registered toolset names now resolve everywhere a tools option is taken. A string entry of `AgentOpts.tools`, a profile's `tools`, or the sandbox dialect's `tools` names a toolset registered under `createEngine({ defaults: { toolsets } })`, expanded through the same canonical `resolveToolset` path as ToolDef and ToolSource values: unknown names are a typed `ConfigError` at spawn time before any provider call, duplicates and collisions are validated after the union, the resolved contracts land in `toolsetHash` and the journal identity exactly like directly passed definitions, and registry values may not nest other names, so no cycle can exist. This closes the v1.17.0 review P1-3: the planner API card and the docs taught `tools: ["name"]`, the sandbox bridge required strings, and the core rejected every string, so the documented construct could never run. `profileCard` now renders the registered toolset names as a closing line when the registry is non-empty (byte-identical output for engines without toolsets), so a planner can only name declared registries. Migration: strings previously always threw (`tools by registered name ... are not supported here`); they now resolve or fail with `unknown registered toolset '<name>'`. No behavior changes for ToolDef and ToolSource entries.

### 1.17.0

### 1.16.2

### 1.16.1

### 1.16.0

### 1.15.0

### 1.14.0

### 1.13.0

### 1.12.0

#### Patch Changes

- 46edcc0: An exhausted run settle no longer drops the typed failure when the throw was an `AgentCallError`: the exhausted branch now projects it through `agentResultWire` exactly like the error branch, so `outcome.error` keeps the agent's typed budget failure (and any engine-decided abort class) in the parallel-exhaustion race where one branch's agent fails while the run budget is already exhausted. The common paths were already typed: a direct `BudgetExhaustedError` carried its wire before, and the in-loop turn-guard denial surfaces as `budget_exhausted` with zero over-ceiling calls, now pinned by an engine-level regression test.

### 1.11.0

#### Minor Changes

- 0c70c5e: Close the execution segment at settle: exactly one segment owns a run (v1.10 deep E2E review, P1). Previously, `resolveExternal` on a handle whose `result` had already settled `'suspended'` silently woke the parked body through the live registry, and the documented resolve-then-resume sequence then started a second segment over the same journal: the approved tool executed twice, the post-approval turn was paid twice, and both segments minted the same journal seq (two terminal agent entries with duplicate seqs). Now every settle closes the registry: parked branches never run again, a post-settle `resolveExternal` validates like the live path and appends the durable resolution through the journal fold WITHOUT waking anything, and the one continuation belongs to the next `engine.resume`. The pre-settle live path (resolving from an `approval:pending` listener) is unchanged. Repeated resolution is now the documented no-op instead of a throw: once the target suspension is closed, `resolveExternal` returns `{ applied: false, reason: 'already_resolved' }` (journaled through the first-closing-wins arbiter) rather than `InvalidResolutionError`; an unknown key still throws, and an invalid payload still throws without journaling. Segment ownership is also enforced at the front door: a second concurrent `engine.run` or `engine.resume` of a runId that already has a live segment in the same engine throws a typed `ConfigError` before any side effect. Defense in depth at the store boundary: `InMemoryStore` and `JsonlFileStore` now enforce the monotonic-seq obligation, rejecting an append whose `seq` is not strictly greater than the stored tail with the typed `JournalOrderViolation`, so two stale-tail writers can never both persist. New public API: `ExternalRegistry.close()`, `ExternalRegistry.closed`, and `ExternalRegistry.suspensionKeyOf(entry)`. Docs: `guide/durability#resolving-a-settled-run` states the ownership rule and both safe orders; tools, testing, troubleshooting, CLI, stores, and store-authors pages align with it, and the documented sequences are now executable regression fixtures.

### 1.10.0

#### Minor Changes

- 0e8d78e: Settle empty max-tokens turns as a typed output truncation, never an empty success. A schema-less turn (no schema, no required terminal tool) whose completion ends with finish reason `max-tokens` and no visible text now settles `limit` with the new `abortClass: 'output-truncated'`, a terminal-kind error, and an actionable message, instead of `ok` with `''`. The same check covers a routed finalize invocation, whose synthesis is the schema-less answer; a max-tokens turn with visible text keeps settling `ok` with the partial text. Like the no-progress abort, the truncation stamps `memoizeOutcome` on the terminal entry, so every resume replays the typed outcome with zero provider calls. The abort class now rides every projection of the failure: the journaled terminal error payload, the run-level `outcome.error.data`, dropped items, and thrown `AgentCallError` wires, so consumers such as the planner see the typed truncation instead of burning self-repair rounds on `compile/empty-source` under an unchanged output limit. `AbortClass` widens to `'no-progress' | 'output-truncated'`, and the projection helper is exported as `agentResultWire(result, fallbackMessage)` alongside `agentErrorToWire`.

### 1.9.0

#### Minor Changes

- 3a53383: Report pricingVersion drift on resume.

  The `orchestrator_budget_reserve` decision already pins the `pricingVersion` in effect when a run started, but the resume recovery only compared the frozen cap dollars. A resumed run now also compares the journaled version against the live table (`unpriced` when priced from the adapter caps fallback) and emits `termination:config-drift` with field `pricingVersion` when they differ. The divergence is reported, never honored or refused: price interpretation is live by design (the journal stores usage; dollars are re-derived from the current table against the frozen cap dollars), replay stays byte-identical, and no provider work is repeated. Reserve decisions journaled before the field shipped resume quietly.

### 1.8.0

#### Minor Changes

- 57ea1de: `ResumeReport.orphaned` now follows entry-type pairing rules and lists only effect roots that genuinely need recovery: dangling dispatches (a `running` entry with no terminal) and suspensions with no resolution, neither consumed by a live call nor covered by abandon. Terminal decisions, `termination.*` and `plan.*` entries, settled roots (whatever their terminal status), and resolved suspensions are complete by construction and never appear, so a fully successful replay reports `orphaned: []`. Previously the list contained every journaled operation not consumed through forward matching, which flagged spawn-admission decisions, plan revisions, settled agent roots, and resolved wake suspensions on perfectly healthy replays (the v1.7.0 follow-up review's finding).

  Deleted settled calls are still silently skipped and never re-paid; they are just no longer listed. A deleted call whose dispatch was left dangling still reports, which is the case that actually needs attention.

- 7884ec5: PlanRunner plan admission is now atomic with child dispatch admission (the v1.7.0 follow-up review's P1). Previously a `plan_revise` op could be journaled as `admit` (consuming its spawn unit) and only then have `scheduleReady`'s dispatch rejected by the engine budget, stranding the node ready forever, losing the `plan:revised` event, and burning the orchestrator budget with no worker output.

  - An `add_task` op whose resolved profile `estCost` cannot fit the effective child ceiling (rung-resolved `maxCostUsd`, else `budgetUsd`) is bounced at rebase time with the new typed reason `reserve_exceeds_budget` naming the child account, requested and resolved reserve, ceiling, and minimum correction. No plan state changes and no spawn unit is consumed; the `plan_revise` tool result carries the reason verbatim.
  - The read-only admission branch now projects the SAME reserve the dispatch layer will commit (estimate clamped by the explicit child budget only), plus the pending reserves of earlier ops in the same revision, so every embedded admit of one batch is dispatchable under the snapshot it was decided on. The dynamic `spawn_agent` path passes the profile estimate into admission for the same reason.
  - Layer 1 (ctx.agent) clamps its committed reserve to the tightest `child-allowance` account headroom on the chain (a plan node's own sub-account, a `ctx.workflow` child ceiling): an allowance already bounds the child's lifetime spend, so an estimate above it clamps instead of denying, which is what makes "admit implies dispatchable" hold by construction. The run root and orchestrator cap are never clamped against; their headroom is shared money that projected admission keeps protecting.
  - `plan:revised` and `termination:debit` now emit strictly after the durable revision append and before the scheduling effects, so a scheduling fault cannot erase an applied revision from the event stream.
  - The residual class (facts that genuinely changed between admit and dispatch, e.g. the engine lifetime spawn cap) lands the node terminally `failed` through a journaled `plan.decision` with the new origin/cause `dispatch-rejected`; other ready nodes still dispatch and the run proceeds.

  Acceptance tests cover the review's live shape (profile `estCost` 0.015 against `budgetUsd` 0.01), the positive control, resume idempotence, the containment path, and an admit-implies-dispatchable property grid over estimates, budgets, ceilings, flat reserves, and prior commitments.

- 52db30d: `termination.init` now freezes the ACTUAL orchestrator budget dollars instead of zeros, closing the journal-contract gap the v1.7.0 follow-up review found: the budgets guide documents `orchestratorCapUsd` and `finalizeReserveUsd` as frozen in the same limits vector as the counters, but PlanRunner journals stored `0` for both and only the later `orchestrator_budget_reserve` decision carried the real values.

  - The engine resolves the effective cap and finalize reserve strictly before extension boot and exposes them on `OrchestratorExtensionIO` (`orchestratorCapUsd`, `finalizeReserveUsd`); PlanRunner writes them into `termination.init`.
  - On resume the cap dollars are now recovered from the frozen `orchestrator_budget_reserve` decision instead of being re-derived from live options (DEF-2 config-drift-resume: the journal wins). A diverging live `capUsd`/`capFraction`/`finalizeReserveUsd` emits `termination:config-drift` and is never honored.
  - Journals recorded before this release (zeros in `termination.init`) replay unchanged: the fold reads the init entry by kind, and the reserve decision remains their authority.
  - The reserve-decision presence guard is now scoped to the orchestrate call, so nested capped orchestrations each journal their own freeze.

  The frozen cassette catalog is re-recorded (the init limits vector and its content key change); hashVersion stays 2, and the fixture lock refresh carries the required hashVersion-bump token.

#### Patch Changes

- 25724b5: The no-progress abort message now links the public docs (https://docs.rulvar.com/guide/agents#the-agent-loop-and-turns) instead of the retired internal spec reference "docs/06 Appendix A". Runtime-visible errors reference public documentation only. The stall-streak cassette embedding the message was re-recorded byte-for-byte otherwise; hashVersion stays 2, but the fixture lock refresh requires the hashVersion-bump token.

### 1.7.0

#### Minor Changes

- 45285aa: Budget exhaustion errors now name the ceiling that actually ended the work. `BudgetExhaustedError` from agent execution reports the first closed account walking up from the debited scope (its scope, ceiling, spend, and reserves) plus the run root state, classified as `root`, `orchestrator-cap`, or `child-account`, both in the message and in typed `data`; a crossed orchestrator cap no longer masquerades as `run budget ceiling reached`. `RunBudget` gains the `exhaustionDiagnostics(scope)` projection behind this, and the orchestrator emits a warn log when an explicit `budget.capUsd` is silently bounded by the default `capFraction` 0.2 of the run ceiling (pass `capFraction: 1.0` to make `capUsd` the sole bound; the docs now spell out the min formula trap).
- 2f20d1d: `CostReport` is now replay stable and internally consistent: the engine builds every settled outcome's report from one pure journal fold (`costReportFromJournal`), so a replay only resume reproduces the complete report byte for byte, including the orchestrator block (`spentUsd`, `share`, `wakes`, `forcedFinish`, `reserveUsedUsd`), which previously read this process's live budget accounts and collapsed to zero on replay. Terminal entries now carry additive `costAttribution` facts (phase, agent type, primary role, debited budget account, finalize reserve flag); they are policy, never identity, exactly like `usageByModel`, and entries written before the field shipped fold under documented fallback buckets. One inclusion policy applies to the total and every breakdown alike: non abandoned terminal usage exactly once, so `byModel`, `byPhase`, `byAgentType`, and `byRole` each sum to `totalUsd` even after resumes that re paid attempts. `orchestrator.wakes` now counts armed (journaled) wake suspensions. The frozen cassette catalog was re recorded for the new journal byte form; identity derivation is untouched and old journals replay unchanged (the hashVersion stays 2; the token hashVersion-bump here sanctions the fixture lock refresh ceremony, not a version change).

#### Patch Changes

- 22f65a8: The development mode bare nondeterminism detector no longer warns when Node's own machinery consults `Date.now` or `Math.random` inside a run's async context. Frames with `node:` specifiers (the undici transport behind global `fetch`, timers, stream internals) are now classified as library provenance alongside `node_modules`, eliminating the false `RULVAR_BARE_DATE_NOW` observed at `processResponseEndOfBody` during in run `fetch` calls. Direct calls from workflow files still warn exactly once per run.
- 2ddfa29: Documentation: the mode (c) resume contract is now stated as it actually works. `orchestrate()` builds its workflow internally and never registers it, so bare `engine.resume(runId)` cannot resolve it; the orchestration modes guide and the resume table now document the two working forms, `engine.resume(runId, makeOrchestratorWorkflow(goal, opts))` with the original inputs or a one time registration under `defaults.workflows` with `ORCHESTRATE_WORKFLOW_NAME`, with an executable test covering both, and the troubleshooting guide gains the symptom first entry for the `rulvar-orchestrate` not registered error.
- 2abd9c2: A resumed dynamic orchestration now honors the documented mode (c) contract after a budget cancelled root. Recovery is orchestration scoped instead of attempt scoped: journaled spawn decisions recover across root attempts (they live at the orchestrate call's own stable scope), recovered children re dispatch pinned to their journaled child scope so settled ones replay by content key for free and only dangling ones rerun, prior attempt handles alias to the recovered records so a restored transcript's await and cancel calls keep working, and the rerun root boots from the cancelled attempt's last turn boundary checkpoint instead of re planning from scratch. A regenerated turn that diverges from a lost one decides fresh (the recovered verdict binds only when the incoming spec matches the journaled one). Previously the rerun derived its recovery scope from the new dispatch seq, saw nothing, re decided every spawn, and re paid completed children.
- 1c1175d: An agent configured with a required terminal tool (the dynamic orchestrator's `finish`) no longer settles ok on a turn that ends without any tool call. Such a turn, including one cut by the output token bound before any call, now consumes the no progress budget and re prompts the model toward the tool, so `orchestrate()` returns ok only after a validated `finish({ result })` was intercepted; a model that never complies terminates as a bounded typed `limit`, never as ok with unproven output. The forced finish exhaustion path keeps synthesizing its documented partial. Ordinary `ctx.agent` calls without a terminal tool are unchanged.

### 1.6.0

#### Minor Changes

- df416fc: Correct and extend model pricing: GPT-5.6 entries, long-context tiers, no fabricated prices, no double-charged cache.

  - `Pricing` gains optional long-context `tiers` (`PricingTier`): the highest threshold strictly below the full prompt re-prices the entire request, input-side rates (cache included) scaling by `inputMultiplier` and the output rate by `outputMultiplier`. Existing linear rows are untouched.
  - `@rulvar/openai` seeds `gpt-5.6-sol` and its `gpt-5.6` alias with the official caps and pricing (1,050,000 context, 128,000 max output, $5/$0.50/$30 per MTok, $6.25 cache write, 2x input and 1.5x output above 272K input tokens). Previously the unknown-model fallback silently priced them as gpt-5.4.
  - Unknown model ids in both first-class adapters keep conservative transport caps but no longer receive a fabricated price row: their usage surfaces in `CostReport.unpriced` and a USD ceiling warns that it cannot bound them. Provide a versioned `createEngine({ pricing })` row for hosted models the tables do not know yet.
  - `priceUsdOf` no longer double-charges cache tokens: under the Usage invariant `inputTokens` is the full prompt, so the input rate now bills only the uncached remainder while cache reads and writes bill at their own rates (a row without cache rates bills them at the input rate). Cache-heavy runs previously over-attributed cost by the full input rate on every cached token.
  - Admission reserve estimation routes through the same `priceUsdOf`, so estimates and settled costs share one formula, tiers included.
  - Model id resolution picks the longest matching table prefix, so a dated `gpt-5.5-pro-...` snapshot resolves to the pro entry, never the shorter `gpt-5.5` sibling.

- a737810: Make budget admission projected and add a pre-dispatch output bound (layer 2b).

  - **Projected admission (layer 1).** A spawn is admitted only when `spent + committedReserve + finalizeReserve + proposedReserve` fits the ceiling of every account in its ancestor chain, checked atomically before anything commits. An exact fill is allowed; one dollar past the ceiling is not. Previously the proposed reserve was not part of the check, so the first call under a `budgetUsd: 0.001` run with a `0.01` estimate was admitted and one full provider turn was paid (10.5x the ceiling in the live reproduction). The denial happens strictly before any provider dispatch, journal entry, spawn counter, or reserve commit.
  - **Pre-dispatch output bound (layer 2b).** Every turn's wire `maxOutputTokens` is clamped to `min(model capability, limits.maxOutputTokensPerTurn, budget-derived limit)`, where the budget-derived limit is what the tightest remaining ceiling in the chain buys at the serving model's output price (long-context tiers included) after a heuristic prompt-cost estimate. A turn is denied outright only when the remainder cannot buy one output token at zero input (exact, no heuristic); when only the prompt estimate says the turn does not fit, it dispatches with a one-token output floor and the exact layers settle the difference. `RunBudget.maxAffordableOutputTokens` and the pure `affordableOutputTokens` helper are new public API; `BudgetHooks` gains the optional hook.
  - **Reserves never exceed what a spawn can spend.** A child with its own sub-account ceiling reserves at most that ceiling; a capped orchestrator reserves its cap minus the committed finalize carve-out (the forced finish has its own reserve); an unpriced model reserves nothing unless an explicit `estCost` is given, because a USD ceiling cannot bound it anyway (the existing loud warning and `CostReport.unpriced` still apply).
  - `admissionReserveUsd` accepts `maxOutputTokensPerTurn` and clamps the priced worst-case output term with it, so hosts can bound reserves through limits instead of hand-written estimates.

  Migration: runs whose ceilings are smaller than their spawns' reserves now fail fast at admission with `BudgetExhaustedError` instead of overshooting. Give calls realistic `estCost` hints (see the updated Quickstart), set `limits.maxOutputTokensPerTurn`, or raise the ceiling.

- 9eb66b4: Scope the dev-mode bare-nondeterminism detector to the workflow's async context.

  The `RULVAR_BARE_DATE_NOW` / `RULVAR_BARE_MATH_RANDOM` detector patched `Date.now` and `Math.random` per execute inside a process-global window and restored them on exit. Anything on the event loop during that window (host code, telemetry, code entirely unrelated to the run) could trigger a false warning, and two overlapping runs could race the patch/restore pair, leaving a stale patched global installed forever that then warned outside any run. The published Quickstart reproduced a false `RULVAR_BARE_DATE_NOW` this way.

  The globals are now patched once per process (dev mode only, never restored) and attribution rides an `AsyncLocalStorage` store entered around the workflow body: only code inside a run's own async context can warn, at most once per run per global. Host code running concurrently with a run, engine internals awaiting the result, and other runs are structurally silent; the `node_modules` exemption for provider SDKs and installed dependencies stays as the secondary check. Direct `Date.now()` / `Math.random()` inside workflow code still warns exactly as before.

#### Patch Changes

- da4dbad: Write the product name as Rulvar in prose: package READMEs, npm descriptions, and the
  documentation site now capitalize the brand. Identifiers keep their exact casing, so
  package names, the `rulvar` binary, `rulvar.config.mjs`, the `.rulvar` store directory,
  the `rulvar.*` OTel attributes, and every URL are unchanged. Documentation and metadata
  only; no runtime behaviour changes.
- 487da86: Align every budget claim with the enforced contract.

  One precise formulation now appears everywhere the budget is described (README, docs landing, quickstart, budgets guide, design principles, invariants table, and the `RunOptions.budgetUsd` API comment): an immutable run budget with pre-dispatch reservation (projected admission, exact fill allowed), a budget-derived `maxOutputTokens` clamp on every turn, live stream cuts on crossing, and a documented provider-dependent residual overshoot of at most one clamped in-flight turn per concurrent agent. No surface claims a literal hard dollar cap without stating the bound in the same breath.

### 1.5.2

#### Patch Changes

- 54936a0: Assemble the Slack and Google credential samples in the masking policy test at runtime so public secret scanners stop flagging the source blob; the runtime strings the policy masks are unchanged.

### 1.5.1

#### Patch Changes

- 6c6d56f: The too-old-journal refusal no longer points at an export that does not exist.

  `JournalCompatibilityError` with subCode `HASH_VERSION_TOO_OLD` interpolated the version into a symbol name, so a v0 journal produced the hint `enable deriverV0 from @rulvar/compat via extraDerivers`. `@rulvar/compat` ships `deriverV0Synthetic`; there is no `deriverV0`. A reader with a genuinely too-old journal was sent to an import that is not there, and a dead end is worse than no hint.

  The hint now names the mechanism and the package, never a symbol, so it cannot go stale when a frozen profile is named something else:

  ```
  register a hashVersion 0 KeyDeriver through createEngine({ extraDerivers });
  @rulvar/compat ships the frozen profiles
  ```

  Nothing else changes: the refusal is still typed, still raised before any live call, append, or admission reserve, and `extraDerivers` still reopens the window exactly as before.

### 1.5.0

#### Minor Changes

- 4fba3c7: Cost attribution is now correct for agent calls that span several models, and the two adjacent holes around them are closed.

  - **Per-serving-model pricing.** The `loop`, `extract`, `finalize`, and `summarize` roles resolve independently, so one `ctx.agent` call routinely spans models at different prices. The whole call was priced at the loop model's rate, which billed a cheap extract as if it had been the expensive loop and made routing extraction to a small model look free of savings. Usage is now split by the model that actually served it, and every fold (the live `CostReport`, the kernel ledger behind `outcome.cost.totalUsd`, `costReportFromJournal`, and replay) prices each slice at its own rate. The split rides the terminal journal entry as the new optional `usageByModel` field and the turn checkpoint, so it survives a crash and a resume; it is written only when a call genuinely spanned models, leaving single-model journals byte-identical. `usage` and `servedBy` were never part of the content key, so identity and replay are untouched.
  - **`CostReport.byModel` is keyed consistently.** The live path bucketed by the _requested_ model while the journal fold bucketed by the _serving_ one, so the same run reported two different breakdowns under transport failover. Both now key by the serving model, and `AgentResult` carries the optional `usageByModel` breakdown.
  - **An unpriced model can no longer escape a ceiling in silence.** A model absent from the price table debits nothing, so a USD ceiling does not bound it. That is honest for a local model and a hole for a hosted one whose price row is merely missing: the run now emits a warning-level `log` event, once per model, naming the model and saying the ceiling does not bound it. Its usage still surfaces under `CostReport.unpriced`.
  - **Routing to an unregistered adapter names the role and the adapters you do have.** Every schema-bearing `ctx.agent` call resolves the `extract` role up front, so a routing default that crosses providers (the recommended `extract` default targets OpenAI) failed with a bare "no adapter registered for 'openai'". The error now reads `role 'extract': no adapter registered for 'openai' (ModelRef 'openai:gpt-5.4-mini'); registered: anthropic. Pass the adapter to createEngine, or route this role to a registered adapter through defaults.routing`.

- 8655c0f: `defineWorkflow` accepts `model`, `routing`, and `effort`, wiring the workflow-defaults layer the resolution chain always documented.

  The router has always taken a `workflow` layer and the model routing guide has always described a four-layer chain (call override, agent profile, workflow defaults, engine defaults), but nothing could populate layer 3: `defineWorkflow` took only `{ name, args, errorPolicy }`, so a workflow could not carry a model policy of its own. It now can, which is what you usually want for a whole class of work ("triage is cheap; the incident report is not") instead of repeating the routing on every `ctx.agent` call.

  ```ts
  const triage = defineWorkflow(
    { name: 'triage', routing: { loop: 'anthropic:claude-haiku-4-5' } },
    async (ctx, args: { issues: string[] }) =>
      ctx.parallel(args.issues.map((i) => () => ctx.agent(`Classify: ${i}`))),
  );
  ```

  The layer rides the scope, so it follows the **call tree, not the file**: a child spawned through `ctx.workflow` contributes its own defaults inside its scope and they stop at its boundary. It sits under the agent profile and the call override and over the engine defaults, exactly as documented, and it applies to every invocation role the call resolves (loop, extract, finalize, summarize, and each failover fallback).

  Backward compatible by construction: a workflow that declares nothing contributes no layer and resolves precisely as before, so existing journals keep their content keys. A `CompiledWorkflow` has no routing surface and contributes no layer.

### 1.4.0

#### Minor Changes

- c4f563d: Production readiness fixes from the July 2026 full audit.

  - The `budgetUsd` ceiling now survives resume: the engine records it in `RunMeta.budgetUsd` and restores it on every resume, so the replayed spend counts against the original invocation's bound and `ResumeOptions` still exposes no way to raise it. Journals written before the field existed (or read through a store that drops optional `RunMeta` fields) resume uncapped, exactly as before; the conformance kit gains a round-trip check so custom stores cannot drop the field silently.
  - `spawn:rejected` and `resolution:applied` / `resolution:superseded` are now emitted: live admission rejections carry the rejection `code`, `agentType`, and the journaled decision `entryRef` (absent only for pre-admission config gates), and live resolution attempts report winning or losing the first-closing-wins fold. `spawn:admitted` now carries the decision `entryRef` and the admitting `verdict` arm. The `orchestrator:budget` union member now types the two payload shapes actually emitted; `journal:compat` stays declared but unemitted (the scan runs before a run's event stream exists) and its TSDoc says so.
  - `toOtel` implements real parent-child span nesting when `contextApi` and `setSpan` are passed; without them spans stay flat but attributed.

  - `'readonly'` isolation now compiles a deny rule for tools declaring risk `write` or `destructive` into the spawn's permission chain, exactly as the tools guide documents; read tools and other isolation modes are unaffected.
  - VCR `replay()` refuses a cassette recorded outside the engine's hashVersion support window (`[CURRENT-1, CURRENT]`) with a typed `ConfigError` instead of silently drifting; in-window cassettes replay as before.
  - `InMemoryStore` accepts `{ quiet: true }` to opt out of the durability warning, and the warning text now states the precise truth: nothing survives a process exit and cross-process resume is impossible (same-process resume of a kept instance works). `createTestEngine` constructs its store quietly, so the blessed offline tier no longer prints a misleading warning.
  - The bare `Date.now()` / `Math.random()` development warnings no longer blame workflow code for calls that originate in library internals (the engine's own retry jitter, provider SDKs): the retry jitter uses a natively captured `Math.random`, and the in-process guard skips callers that live under `node_modules`.
  - `rulvar run --profile` now applies the profile's per-role effort hints: entries in `defaults.routing` that carry no effort are seeded from `RunProfile.effortByRole` (an explicit host effort always wins; ladder entries and unrouted roles stay untouched).
  - `rulvar --help` documents the shipped `kb inbox` and `kb gate` subcommands.
  - The unscoped `rulvar` pointer package ships TypeScript declarations (`index.d.ts` with a `types` export condition), so strict TypeScript projects can import the bare name; the install smoke gate now packs and checks the pointer alongside the umbrella.

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.

### 1.3.0

#### Minor Changes

- 7d1a287: ModelKnowledge phase 3, first slice (M12-T02, unlocked by the passed measured-value checkpoint): the kb_propose orchestrator tool and the quarantined modelObservations write path. PlanRunner registers kb_propose on explicit opt-in (PlanRunnerOptions.kbPropose, like any opt-in tool); its payload is tier-relative (the orchestrator never names a model) and the engine resolves the tier against the referenced lineage's declared ladder into the concrete KbProposal subject, validates that the tier has a journaled attempt and that evidence refs resolve to this run's decision entries, and journals the proposal as the observation_add ledger.op through the single-writer path. Quarantine is absolute: the ack is entryRef only, ledger_read withholds observation content behind a count (byte-stable for observation-free renders), worker prompts never see it, and nothing can commit during a run (the runtime handle has no write path by API shape); proposals reach the human gate only through the post-run LedgerExport. Core exports KbProposal, KbProposalTrigger and the typed model-free proposalStatement template. The kb-propose-quarantine cassette joins the frozen catalog (61 IDs).

### 1.2.0

#### Minor Changes

- 890f42c: The knowledge card gains the profile-evidence section (docs/05 section 4.3 as amended): eval-measured claims project onto the advertised spawn vocabulary, one line per concrete-model profile with a conservative weakness-over-strength fold across efforts, plus a fixed spawn-guidance line. FR-607 commits the card to feeding agentType choice at spawn, and the M12 checkpoint measured that tier-relative rows alone carry no agentType-actionable signal (criterion 2: equal quality, cost overhead, no steering). Ladder declarers and model-less profiles do not participate; the section renders only when at least one profile line exists, so every previously recorded card stays byte-identical; model names still never render.

#### Patch Changes

- 3bfaec0: A capped orchestrator dispatches its own agent with estCost equal to its effectiveCap, and the forced-finish agent with the finalize reserve (docs/07 section 12.2 as amended): layer 2 makes those the true admission worst cases. Without the hints the default reserve priced the model's full maxOutputTokens (about one dollar on strong tiers) and the commitment rode the whole ancestor chain for the orchestrator's lifetime, so small run ceilings sat at zero admission remainder and every child spawn died with a budget rejection. Found live by the M12 checkpoint: no orchestrated child was ever admitted under the case ceilings, and both A/B arms measured a self-solving orchestrator instead of agentType selection.
- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.

### 1.1.0

#### Patch Changes

- d16b04a: Plain orchestrate treats ladder-declaring profiles as declaration-only (docs/07 section 10 as amended): the spawn vocabulary in the profile card advertises concrete profiles and lists declarers on a separate context line, and spawn_agent naming a declarer is rejected with a typed ConfigError before admission instead of dying later at wire resolution. Found live by the fifth M12 checkpoint run: the knowledge card praises ladder tiers by profile name, so the card-informed arm kept spawning the declarers and measured far below the uninformed baseline.

### 1.0.0

#### Major Changes

- 464ab6e: rulvar v1.0.0: the first published release. An embeddable TypeScript engine for durable, budget-bounded, testable multi-agent LLM workflows: an append-only journal with byte-deterministic replay and crash resume over JSONL or SQLite (multi-process workers with lease fencing), hermetic VCR cassettes gating CI through a frozen 60-cassette defect catalog, hard per-run USD ceilings with orchestrator sub-budgets, finalize reserves and admission control, adaptive orchestration (typed plan revisions with rebase, escalation protocols, model ladders, wake digests, lineage and reuse), ModelKnowledge phases 1 and 2 (the git-reviewed model-suitability claim store with TTL decay, eval-measured claims from matrix sweeps, canary fingerprints, and the one-rung-clamped verified layer), provider adapters for Anthropic, OpenAI-compatible and Google plus a Vercel AI SDK bridge, an eval framework, and the rulvar CLI (run, resume, runs, inspect, plan, kb). Licensed Apache-2.0. The six core SPI seams are frozen; ModelKnowledgeStore freezes with this release per docs/05. Ships the M9 through M11 scope together per the 2026-07-11 amendment to docs/12 section 2.

#### Minor Changes

- 0e0b569: M10 entry: the render budgets of docs/06 Appendix A are committed (the TBD-before-M10 rule) and wired as engine defaults; OQ-04 (the renderBudget measure) closes on the CHARACTER measure.

  - WakeDigest: 400 chars per outputSummary row, one exported constant (`WAKE_SUMMARY_RENDER_BUDGET_CHARS`) now serving both the distillation cap (adopted unchanged, the value frozen into every cassette since M6) and the digest render default of `renderBudgetChars`, which stays overridable per orchestration.
  - ledger_read render: 65536 chars over the serialized view via the new pure `boundLedgerRender` (exported with `LEDGER_RENDER_BUDGET_CHARS`): over budget, rows drop deterministically oldest-first (auto-derived joins before authored sections, the mission brief slices last) and every drop renders as a FLAGGED discrepancy line. The section caps stay the primary bound, so under default termination limits the belt never engages; all frozen fixtures are byte-identical.
  - KB card: 4096 chars, committed in docs and consumed by the M10-T03 card renderer.

- b28b7a3: M10-T01: the ModelKnowledgeStore SPI and the default file store (docs/05, sections "Data model" and "Commit discipline"). The engine-scoped, per-project, append-only claim store lands as a new SPI seam, a neighbor of JournalStore, freezing with knowledge-base phase 1 post-1.0 (never touching the six frozen core seams).

  - `ModelKnowledgeStore { current; commit(ops, expectedVersion) }` with CAS on the monotonic snapshot version, mirroring the lease fencing discipline; concurrent commits serialize through the retryable `KnowledgeCasError` and rebase. There is NO propose() method in the SPI at all, and the runtime handle type `ModelKnowledgeHandle = Pick<..., 'current'>` physically lacks commit (docs/05 security channels 2 and 3).
  - The full docs/05 claim data model as types: `ModelClaim` (subject with effort as part of identity, mandatory taskClass and evidence, TTL fields, append-only supersede), `GateRecord` (the human variant does not assemble without the attribution attestation), `ClaimOp`, `EvidenceRef` (entryRef is the journal seq), `KnowledgeSnapshot`. The `TaskClass` vocabulary upgrades from bare string to the docs/05 union (the six floor-aligned classes plus open extension), canonically resident with the knowledge SPI and re-exported by the floors module.
  - `FileModelKnowledgeStore` defaulting to `./rulvar.models.json`: git-diffable pretty JSON with atomic temp-plus-rename replace; append-only mechanics (supersede and archive flip status, never delete, preserving the audit trail); referential integrity as typed ConfigErrors; the empty snapshot (version 0) when no file exists.

- b53a89e: M10-T02: the editorial claim path, validated (docs/05, sections "Data model", "The human gate", "Grounding and decay"). The runtime enforcement the T01 types promise:

  - A gated op without the attribution attestation is now a RUNTIME error at commit, not only a type error: the human gate requires a non-empty ruledOut checklist over the docs/05 vocabulary, and the eval-confirmed gate rejects as reserved for v2.
  - The editorial path is the only committable path in phase 1: eval-measured claims and the metrics block reject until the M11 eval-committer identity ships (the validators already model the identity flag M11 will pass).
  - The active-claims cap holds at commit: 8 per (model, taskClass) by default (docs/06, Appendix A), configurable per store; supersede chains keep only the head active, so a supersede never grows the count.
  - Statement bounds (200 chars), mandatory evidence and taskClass, date coherence, and the asymmetric TTL table land as pure helpers: `claimExpiry` (eval 90/30, editorial 120/45 days by polarity) and `claimExpired` for the read-path filters of M10-T03.

- 4454175: M10-T03: the ModelKnowledge read path (docs/05, sections "Read path" and "Security"). kb_pinned and kb_repinned land, the card renders, and the whole feature is store-gated: an engine without `stores.modelKnowledge` writes no kb entries at all, so every existing journal and cassette stays byte-stable (zero added awaits on the off path).

  - `createEngine` accepts `stores.modelKnowledge`; the runtime holds ONLY the `current()` handle (commit is physically absent inside runs).
  - One read at run admission for orchestrate-role runs: the engine filters claims (active, unexpired, reachable through the run's declared ladders after the role-floor filter) and journals `kb_pinned { version, hash, cardText }` with the card bytes EMBEDDED, strictly before the first orchestrator turn. Resume and replay read the entry bytes and never touch the live store.
  - A fresh `kb_repinned` lands on every wait_for_events wake under the same filtering rules against a FRESH store read, so expired, stale, and archived claims never steer spawns after pauses; a mid-run store commit affects only subsequent pins.
  - `modelKnowledgeCard`: deterministic, two-layer, tier-relative, 4096-char budget (oldest notes withhold behind an explicit marker). The verified layer compiles EXCLUSIVELY from eval-measured claims (empty in phase 1) with the one-rung clamp; editorial notes render dated and explicitly marked, never compiled into a tier; the orchestrator never sees model names. The card docks into the spawn tool description beside the profile card.
  - OQ-11 closes: editorial notes render for every taskClass with no self-description suppression (the nameless tier-relative render already blunts the feared bias).
  - Two catalog cassettes (docs/09, new section 6.11): kb-pin-replay and kb-repin-expiry, recorded offline over a deterministic stub store with time-stable dates; the cassette-catalog CI job runs them.

- 6599ca8: M10-T05: the taskClass binding interim rule becomes the phase-1 resolution (docs/05, section "Phases and placement"; docs/14 OQ-12 CLOSED). The classification source is author declaration: the optional `taskClass` on AgentProfile, TaskSpec, and spawn_agent params; absence means unclassified and stores no literal string anywhere. Card recommendations never apply to unclassified spawns (in phase 1 no recommendation application exists at all; the M11 compiler inherits the rule as normative).

  - The plan dispatch now forwards the declared TaskSpec.taskClass onto the ExtensionDispatchSpec, completing the substrate: a declared class journals inside the spawn-admission decision (spawn_agent path) and the plan.revision spec of record (PlanRunner path), so M11 matrix sweeps and the recommendation compiler slice attempts by class from journals alone.
  - Byte-neutral: journals without declared classes are unchanged; floors stay profile-driven per docs/04.

- 6649e5f: M11-T01: the eval-committer identity activates eval-measured claims (docs/05, sections "Data model" and "Commit discipline", amended with the dedicated `eval-committer` GateRecord variant, distinct from the v2-reserved eval-confirmed proposal auto-gate).

  - Commit validation is now GATE-DRIVEN and the coherence square is schema-enforced in both directions: an eval-committer-gated op MUST carry class eval-measured, author kind eval-pipeline, and the metrics block; a human-gated op MUST NOT carry any of the three (a human-authored op with metrics keeps rejecting). Observational data never carries metrics and never auto-promotes.
  - `@rulvar/evals` ships the pipeline side: `evalMeasuredClaim` (the docs/05 TTL table applied by polarity: strength 90 days, weakness 30) and `commitEvalMeasured` with the documented CAS-rebase recipe against any ModelKnowledgeStore.

- fd2f83b: M11-T03: TTL and staleness (docs/05, section "Grounding and decay"). The decay module (`src/knowledge/decay.ts`) becomes the decay owner: the asymmetric TTL table (eval 90/30, editorial 120/45; inbox 14 days exported as a constant, reserved for M12) and `claimExpiry`/`claimExpired` move there with their names re-exported through the claims module unchanged.

  - The re-measurement queue lands as documented: `remeasureQueue(claims, at)` is JUST a status filter over expired, still-active eval-measured claims (nothing archives them: the next sweep re-measures the subjects); `ttlState` feeds maintenance views.
  - Archive-never-delete maintenance: `archiveDeprecatedModelOps(claims, models)` produces archive ops (reason `deprecated`) for every live claim of a deprecated model; historical runs keep their audit trail.
  - Expiry stays enforced at every pin AND repin through the M10-T03 read-path filter; the acceptance test drives the same filter across the boundary clock: an expired claim stops influencing the card at the next pin or repin.

- 01d6b2d: M11-T04: modelEpoch capture and the canary fingerprint (docs/05, section "Grounding and decay"; OQ-06 CLOSED with the committed design).

  - Core: `modelEpochOf`/`capsHashOf` build the honestly coarse epoch signal (registry version, pricing version, caps hash; silent alias re-pointing stays a documented uncaught case absent probes). The ClaimOp union gains `mark_stale` (docs/05 amended): section 6 requires status stale at fingerprint drift and the closed op set could not produce it; active flips to stale, already-stale is an idempotent noop, terminals never revive.
  - Evals: `canaryFingerprint(engine, probes)` runs the FIXED caller-versioned probe set sequentially through the ordinary engine and hashes NFC-normalized, whitespace-collapsed outputs (the probe count prefixes the hash so probe-set edits never collide with drift). `flipStaleOnCanaryDrift` flips the model's active eval-measured claims whose recorded fingerprint differs, in one CAS-rebased command; claims without a baseline stay untouched. Sweeps stamp the epoch per pool member via `modelEpochFor`.

- 9a20dbb: M11-T06: the verified-layer compiler goes public (docs/05, sections "Read path" and "Composition with the model layer"). `compileVerifiedLayer(claims, ladders)` compiles start-tier recommendations per (ladder, taskClass) EXCLUSIVELY from eval-measured claims with the one-rung clamp (the price of any false belief stays one rung; ties hold the default and compile nothing; editorial claims never compile); the card renders from it and future consumers read the structured rows, never the card text. Floors and ModelCaps stay hard; budget is touched only through the existing admission path.

  Property-tested over seeded random snapshots: no compiled recommendation ever exceeds one rung of displacement or leaves the ladder, editorial-only snapshots compile to nothing, and compilation is deterministic. The M11 OQ sweep rides along in docs/14: OQ-09 closes with the defined M12 gate criteria (A/B sweeps, rung and agentType selection against the no-card baseline); OQ-07, OQ-08, and OQ-10 carry honestly (their triggers cannot fire while every release is founder-deferred).

- 0fbe7ea: M9-T04 (part 1): the DEF-2 and DEF-3 catalog rows deferred at M7 (docs/09 sections 6.2 and 6.3; docs/10 M9 row "Complete catalog green in one CI run"), plus the producers and liveness fixes the rows exposed.

  - Nine new frozen cassettes with public runners and byte-for-byte replay tests: combined-loop-descent, config-drift-resume, class-storm-single-turn, oscillation-bounded, race-timeout-vs-live (DEF-2); respawn-preserves-counter, reworded-lessons-collide, stall-streak-classes-and-pinning, legacy-journal-resume (DEF-3). The class and race rows additionally round-trip their frozen bytes through BOTH reference stores (JsonlFileStore and SqliteStore) with identical loads, per the store-independence rule.
  - `@rulvar/plan`: the class-level escalation decision producer lands (docs/07 6.5): two or more same-kind reports resolved by ONE revision merge into ONE escalation-decision entry with per-lineage `debits` rows and resolvedBy 'class'; a denied per-lineage debit degrades the group to single-target decisions so denial semantics stay per report. The folds already consumed this form; single-target behavior and all existing cassette bytes are unchanged.
  - `@rulvar/plan`: `termination:config-drift` now actually fires on resume when a live termination knob diverges from the journaled `termination.init` (the journal wins, the divergence is reported per field; docs/07 11.2). Events are never journaled, so frozen cassettes are unaffected.
  - `@rulvar/plan`: a `retry` escalation decision re-opens the node AND clears its stale dispatch handle; previously the re-opened node sat ready forever while the scheduler skipped it (the re-dispatch liveness gap behind Flavor B defaultDecision retry).
  - `@rulvar/plan`: `lesson_add` keys once (docs/07 9.2): a repeated add with the same content key acks the recorded lesson instead of appending a duplicate; re-executed-turn recovery is unchanged.
  - `@rulvar/core`: an extension dispatch whose agent dies BEFORE its root entry lands now surfaces the underlying failure loudly to the dispatching caller instead of hanging the dispatch await forever (the pre-root cousin of the stale-writer liveness rule). Healthy paths and replays are byte- and timing-identical.
  - Known residual, unchanged: repeated Flavor B suspensions on ONE re-opened node dedup onto the first suspension's decision key; the recorded cassettes route around it and the at-cap immediate-resolution flavor rows stay with M9-T04's later parts.

- ebe0abc: M9-T04 (part 2): the six DEF-5 catalog cassettes (docs/09 section 6.5; docs/03 section 9), plus the reuse-producer completions the rows forced.

  - Six new frozen cassettes with public runners and byte-for-byte replay tests: oscillation-full-reuse (escalated-terminal donor, shared full link, by-ref root, reclaimedUsdAtLink carries the donor spend), graft-partial-subtree (a three-rung limit ladder severed mid-top-rung grafts exclusively; the completed rung attempts forward-match through the scope alias and only the interrupted rung reruns live, exactly once), crash-between-link-and-root (cut strictly between the durable node.link and the by-ref root; the resume rolls forward with zero repayment), oscillation-guard-trip (the third re-add at maxOscillationsPerKey 2 rejects osc_guard with the embedded verdict and the run closes non-HITL), worktree-disposed-degrade (an unpinned worktree graft donor degrades to a fresh admit with DedupNote graft_unsafe; reuse_full stays allowed for a worktree donor with a terminal root), claim-exclusivity-and-chain (two identical adds in ONE revision: the first grafts exclusively, the second degrades donor_active; the severed grafted node becomes the chain head and the third add drains the chain transitively; oscillationCount reaches 2).
  - `@rulvar/core` (docs/03 9.3/9.6 producer completions, folds and bytes of existing journals unchanged): evaluateReuse now skips exclusively-claimed donors (first-wins) and degrades to a fresh admit with the documented `donor_active` reason when every candidate is captured; a severed grafted node inherits its captured link's chain (ancestry plus chain-tail graft eligibility), so the next add links to the chain head and drains transitively; agent dispatch roots record their resolved isolation (`value.isolation`, only when not 'none') so the DedupIndex worktree rules can read it from the journal.
  - `@rulvar/plan`: exclusive captures are first-wins WITHIN one revision too: the second identical add of the same revision degrades to `donor_active` instead of double-claiming the donor.
  - All fifteen M9 cassettes re-record byte-identically under the double-run agreement; the nine part-1 fixtures are untouched by the producer changes. fixtures.sha256 covers 50 frozen files.

- a3079d0: M9-T04 (part 3): the six DEF-8 catalog cassettes plus the DEF-7 reserve-survives-run-exhaustion row (docs/09 sections 6.7 and 6.8), with the roll-forward and reserve producers the rows exposed.

  - Seven new frozen cassettes with public runners and byte-for-byte replay tests: revise-racing-defaultDecision (the mandatory stale-wake trio dropping dep_already_resolved with blockingRef, node_escalated, node_already_done in ONE revision), crash-after-append-before-effects (the pre-effects kill point; both children spawn live exactly once on resume and the request-only cancel lands on the redispatched branch), amend-vs-running-then-cancel-add, intra-revision-self-conflict (sequential intra-revision semantics), bad-base-streak-terminates (three fabricated-base all-dropped entries then the non-HITL guards fallback), park-races-child-completion (parkRequested extinguished by the child-result transition, no park retention), and reserve-survives-run-exhaustion (adds that would invade the committed finalize reserve drop admission_denied inside the revision outcomes; the forced finish executes FROM the reserve and closes the run ok).
  - `@rulvar/plan`: the idempotent plan_revise recovery path now also re-lands request-only cancels and parks by aborting the redispatched mid-flight branch; previously the crash-after-append-before-effects roll-forward left the cancelled branch running forever.
  - `@rulvar/plan`: an accepted escalation resolution records the node's done reference (doneRefs), so a later waive_dep against the resolved dependency drops dep_already_resolved with the blockingRef pointing at the resolving reference, exactly like a child-result transition.
  - `@rulvar/core`: the forced finish now RELEASES the finalize reserve as it begins (releaseFinalizeReserve): the reserve stops subtracting from the admission remainder at the moment it is being spent, or the finalize agent could never draw the money reserved for it under a tight run ceiling. Admissions stay frozen past the cap, so nothing else can take it. Cap behavior under unlimited ceilings (all existing cassettes) is byte-identical.
  - All 22 M9 cassettes re-record byte-identically under the double-run agreement; fixtures.sha256 covers 57 frozen files.

- 596a39b: The project is renamed to rulvar (the founder decision of 2026-07-11 closing OQ-24; the official domain is rulvar.com). Every package moves to the @rulvar scope (the umbrella is @rulvar/rulvar, the ESLint plugin is eslint-plugin-rulvar), the CLI binary is `rulvar`, the config convention is rulvar.config.mjs, the knowledge store default is rulvar.models.json, the default journal directory is .rulvar, engine warnings use the RULVAR_ prefix, and the orchestrator workflow name is rulvar-orchestrate. Because journaled bytes embed the workflow name and content keys, the entire frozen catalog (60 cassettes and the dogfood journals) was re-recorded under the new name and re-frozen; the turbo lint task now orders after upstream builds (a latent race the rename surfaced). Nothing was ever published under the former name, so no consumer migration exists.

### 0.9.0

#### Minor Changes

- 84f94d4: The v0.9.0 BREAKING release notes (M8 server and queue; the flagged BREAKING sections of the pre-1.0 convention, docs/12 registry).

  BREAKING: TranscriptStore gains the REQUIRED `delete(ref)` method (docs/03 12.4; the OQ-20 interim rule executed at M8-T04: retention is impossible without blob deletion, and `JournalStore.delete` alone would orphan every transcript). How it fails: third-party TranscriptStore implementations stop compiling against the widened SPI. Migration: implement `delete(ref)`; deleting a missing ref MUST be a no-op, never an error; the cascade over a run's blobs stays ENGINE-side (`Engine.deleteRun`), never a store obligation. The shipped InMemoryTranscriptStore and FileTranscriptStore already implement it.

  BREAKING: the Engine interface gains required members `stores`, `deleteRun`, and `pruneRun` (docs/06 10.2; the M8 seam and retention amendments: the shells read the run picture through the engine's stores, and retention needs the cascade and the checkpoint pruning as first-class engine operations). How it fails: custom Engine implementations and structural Engine test doubles stop compiling; ordinary consumers of `createEngine` are unaffected, and `ResumeOptions.lease` stays additive-optional. Migration: expose the configured stores and delegate `deleteRun`/`pruneRun` to the underlying engine (the pattern in `@rulvar/testing`'s `createTestEngine`).

- 65c7b2c: M8-T01: createServer, the HTTP shell (docs/02 section 8.2; FR-702), plus the Engine.stores seam it stands on (docs/06 10.2, M8 entry amendment).

  - `@rulvar/cli`: `createServer({ engine, workflows })` returns `{ fetch(req: Request): Promise<Response> }` with the five canonical routes: POST /runs (start a registered workflow), GET /runs/:id (status and outcome), GET /runs/:id/events (SSE; Last-Event-ID maps to the event seq, replay is at-least-once and consumers deduplicate on `replayed`), POST /runs/:id/external/:key (programmatic resolution, `by: 'external'`; a run that settled suspended in-process auto-resumes; a run not live in this process gets the documented offline append under a lease where the store is leasable, and resumes on a worker), GET /runs/:id/cost (the settled in-process CostReport, or the pure journal fold priced by the optional `priceUsd`). Authentication stays host middleware (docs/14, OQ-16).
  - `@rulvar/core`: the Engine interface gains the readonly `stores` accessor exposing the configured journal and transcript stores; exactly the instances createEngine received (or defaulted), no store contract widens.
  - `@rulvar/testing`: `createTestEngine` forwards the new `stores` accessor.

- a2a3243: M8-T02: createWorker, the queue shell (docs/02 section 8.3; FR-703), plus the two queue seams it stands on (docs/06 10.2 and docs/03 12.3, M8 entry amendment).

  - `@rulvar/cli`: `createWorker(engine, { store: LeasableStore, concurrency? })` leases resumable and suspended runs via acquire/renew/release with fencing epochs (renew cadence ttl/3; Appendix A reference ttl 60000 ms; concurrency default 1). A store without lease capability is a typed ConfigError at start, never a silent split-brain; leasing a store other than `engine.stores.journal` is equally a ConfigError. DEF-6 repeats at acquire: a journal outside the hashVersion window releases the lease and poisons the run for this worker. Stateless workers call bare `engine.resume` with the lease; unchanged suspended runs are skipped until their journal grows; queue semantics stay honestly at-least-once with deduplication by the journal. The OQ-21 residual (original in-process args are not journaled) is bridged by the optional `argsFor` hook.
  - `@rulvar/core`: `ResumeOptions.lease` carries the worker's lease through the kernel's single append site, so a stale writer's appends are rejected by the fencing epoch and never become visible (lease theft impossible by construction); bare `engine.resume(runId)` now falls back from the persisted CompiledWorkflow source to `defaults.workflows[workflowName]` (the registry the queue worker resolves through, docs/06 10.4); the Replayer accepts the lease option.

- ebc8101: M8-T04: the redaction and retention interim rules executed (docs/14 OQ-20 and OQ-22; docs/09 section 8 rewritten to the executed state; docs/03 12.4 and 12.8; docs/06 10.1 and 10.2 amendments).

  - `@rulvar/core`: the L0 SerializationHook (`createEngine({ serialization })`): redact/encrypt at the append/put boundaries, symmetric on load/get, applied by wrapping the stores so `Engine.stores` exposes the one policy point; kernel ordering fields are drift-checked with a loud ConfigError. Default key masking at the telemetry boundary: every emitted WorkflowEvent passes `maskSecrets` (provider keys, PATs, bearer tokens, JWTs, private-key blocks become `[masked-secret]`); opt out via `redaction: { maskEvents: false }`; never touches the journal. Retention: `TranscriptStore.delete(ref)` joins the SPI (missing ref is a no-op; InMemory and File stores implement it), `Engine.deleteRun(runId)` cascades blob deletion before the journal (no orphan transcripts), and `Engine.pruneRun(runId)` deletes checkpoint blobs of ok-terminal attempts that nothing else references (parked, cancelled, escalated, and hanging attempts keep theirs).
  - `@rulvar/cli`: `createServer` and `createWorker` take the opt-in `retention` predicate over RunMeta (the server applies it at terminal settles, the worker during sweeps under a brief lease); the OTel exporter masks string span attributes with the same policy, defense in depth over the already conservative attribute content policy.
  - `@rulvar/testing`: `createTestEngine` forwards `deleteRun`/`pruneRun`.

### 0.8.0

#### Minor Changes

- 85d55cf: The v0.8.0 BREAKING release notes (M7 adaptive orchestration full; the flagged BREAKING minor of the pre-1.0 convention, docs/12 registry).

  BREAKING: the unified `AdmitVerdict` union is extended with the reuse verdicts (`reuse_full`, `admit_graft`) and the new reject codes (`termination_exhausted`, `ladder_exceeds_frozen`, `lineage_exhausted`, `lineage_busy`, `osc_guard`) (DEF-5). How it fails: exhaustive switches over the verdict kind or reject code in custom shells and admission SPI extensions stop compiling. Migration: add branches for the new arms; reject-code switches should route unknown codes to their generic-denial path.

  BREAKING: reuse-by-reference is the DEFAULT (DEF-5). A byte-identical `add_task` after a cancel or abandon no longer re-executes the subtree: the result returns by reference (`reuse_full`) or continues from the paid prefix (`admit_graft`). How it fails: changed semantics; runs that relied on re-execution against a changed world observe referenced results instead. This is the only intentional change of visible semantics in the pre-1.0 line. Migration: set `reuse.enabled: false` on the admission config, or `fresh: true` on the specific `add_task`.

  BREAKING: the config key `maxEscalationsPerNode` is renamed to `maxEscalationsPerLogicalTask` (XF-10): escalations count per logical task across respawns via the lineage chain. How it fails: a typed `ConfigError` naming the new key rejects the old one. Migration: rename the key; the default stays 2.

  BREAKING: the plan-size-scaled revision budget option is removed without deprecation (DEF-2). `maxRevisionsPerRun` is an absolute, non-replenishable counter (default 32) debited by exactly 1 per journaled `plan_revise`; nothing increments it. How it fails: the removed option is rejected at config validation. Migration: size `maxRevisionsPerRun` directly.

  BREAKING: `plan_revise` result and error schemas widen (rebase outcomes, embedded admissions, `revisionUnitsRemaining`) and `WakeDigest` gains the MANDATORY `termination` field beside `planHash`, `budget`, and `reuse` (DEF-2/DEF-8). How it fails: schemaHash and toolsetHash of orchestrator scopes change, so VCR cassettes recorded over orchestrator turns invalidate. Migration: re-record affected cassettes; consumers of the digest type add the new mandatory blocks (all-zero outside PlanRunner).

  BREAKING: B0, the run budget ceiling, is immutable after start (DEF-2): no API, including HITL decisions, can top it up. How it fails: code that mutated the run budget mid-run or expected an HITL top-up hits a typed runtime error; overshoot stays bounded by one turn per in-flight agent. Migration: size the ceiling at start; use the orchestrator cap and the finalize reserve (DEF-7) for graceful degradation instead of top-ups.

  BREAKING: PlanRunner requires a resolvable orchestrator cap (DEF-7). `orchestratePlanned` with no run USD ceiling and no explicit `budget.capUsd`, or with `effectiveCap < finalizeReserve`, refuses to start with a typed `OrchestratorCapConfigError` before any LLM call. Migration: pass `budget: { capUsd }` (or run under a USD ceiling and rely on `capFraction`, default 0.2; up to 1.0 opts out explicitly with a telemetry warning).

- b88c9e3: M7-T02: lineage LogicalTaskId (DEF-3). New `src/journal/lineage.ts`: `LogicalTaskId`/`LineageRelation`/`LineageRef`/`SpawnLineage`, `AttemptOutcomeClass`, `LineageStats`, `SpawnLineageOpt`; approach signatures (`normalizeApproachTag`, `approachSigCoarse`, `approachSigOf`, `canonicalIsolationTag`, sigVersion 1) with prompt prose excluded by construction; `EscalationLimits` with the committed defaults (maxEscalationsPerLogicalTask 2, maxAttemptsPerLogicalTask 8) and a validator that rejects the pre-rename `maxEscalationsPerNode` with a migration hint (XF-10); `LineageIndex`, the incremental pure counter fold (attemptsUsed / escalationsUsed under first-closing-wins and class-decision rules / stallStreak with class skips and resets / approaches grouping), pinnable to a snapshot seq, with deterministic `legacy:` contentHash LTIDs canonized onto journals written before lineage existed (random ULIDs on replay are forbidden). AdmissionController: `AdmitSpec` widens (`lineage: SpawnLineageOpt`, `approach`, `ancestry`, `signature`), `evaluateLineage` enforces the single-live-attempt invariant (`lineage_busy`) and monotonic attempt consumption (`lineage_exhausted`) strictly BEFORE the carrying decision entry is appended, and every non-reject decision now embeds the computed `SpawnLineage` value block reused byte-exact on replay. `ctx.agent` and `ctx.workflow` gain `lineage`/`approach` options; a ctx.agent declaration journals one spawn-admission decision entry before dispatch and recovers it on resume without re-minting. `budgetDefaults.lineage` configures the limits engine-wide.
- f3c4613: M7-T03: TerminationAccount and the termination lemma (DEF-2). New `src/journal/termination.ts`: the frozen `TerminationLimits` vector (V0 32, S0 128, E0 2, D0, kMax from the profile-registry snapshot, B0 immutable, orchestratorCapUsd and finalizeReserveUsd per XF-09) with a validator rejecting the pre-rename `maxEscalationsPerNode` (XF-10); the debit-only `TerminationAccount` (no credit operation exists by construction) with per-resource debits embedding balance-after, atomic NEW-lineage allocation (E0 plus K_l minus 1 rungs) on the spawn debit, strictly monotone rung indices, and the `debit()` surface that writes `termination.denied` strictly BEFORE resolving an underflow; the variant function Phi with `phiInitialOf` (V0 + C by S0, C = E0 + kMax); `buildTerminationInitValue` / `readTerminationInit` for the `termination.init` entry; `foldTermination`, the replay-strict recomputation that rebuilds the account from init, asserts every embedded balance (revisionUnitsAfter, spawnUnitsAfter, escalationUnitsAfter, rungIndexAfter/rungsRemainingAfter) at exactly the diverging entry, debits class-level decision arrays once per lineage, counts timeout defaultDecision resolutions once under first-closing-wins, and collects denials for zero-live-call re-issue; `terminationConfigDrift` (the journal always wins). AdmissionController gains `bindTermination`: under a bound account every admitted spawn of any origin debits one spawnUnit atomically with its decision entry (spawnUnitsAfter becomes the account balance), a declared ladder longer than the frozen kMax rejects with `ladder_exceeds_frozen`, and exhaustion rejects with `termination_exhausted`; `AdmitSpec.ladderLength` and the recorded `AdmissionDecision.ladderLength` feed the fold. The closed AdaptiveEvents catalog (docs/09 section 1.4) joins WorkflowEventBody, including termination:debit / termination:denied / termination:config-drift.
- a41c20f: M7-T05: PlanRunner scheduling and toolset. Core gains the PUBLIC orchestrator extension seam (docs/02 section 4 seam-sufficiency: orchestration packages build exclusively from the public API): `OrchestrateOptions.extension` hosts an `OrchestratorExtension` with boot strictly before the orchestrator's first agent entry, extension tools appended to the mode (c) toolset, an activity hook running after every child settlement strictly before wake evaluation, quiescence participation (nothing running AND nothing ready), digest extras, wake observation, prompt lines, and an `OrchestratorExtensionIO` exposing total-order appends into extension-owned scopes, the journal snapshot, the single admission point, explicit-scope child dispatch through the ordinary ctx.agent path (plan/NodeId sub-accounts open beside the orchestrator account), settled lookups, cancel, ULID minting, and telemetry. `outputSchemaRef`/`toolsetRef` now RESOLVE against the new `defaults.schemas` and `defaults.toolsets` engine registries (unknown names stay typed tool errors); `TerminationAccount.bindDeniedWriter` binds I/O onto fold-rebuilt accounts. @rulvar/plan ships `planRunner(options)` and `orchestratePlanned(engine, goal, opts)`: boot writes `termination.init` (frozen limits with kMax and the profile-registry snapshot hash) strictly before the first scheduling entry and binds the account into admission; plan_view renders the pinned pure fold (plan state, per-node LineageStats, the TerminationAccount snapshot) at the last delivered WakeDigest, with digestSeq 0 seeded as the empty-plan bootstrap snapshot; plan_revise (normative docs/07 4.7 schema) debits one revisionUnit per journaled revision (underflow writes termination.denied first), evaluates the committed rebase at the fold head, appends ONE plan.revision strictly before effects, schedules newly-ready nodes under plan/NodeId scopes, lands cancel requests, re-issues idempotently on re-executed turns (roll-forward), and emits plan:revised plus termination:debit; the engine (never the model) schedules ready nodes and journals ready-to-running and terminal transitions as plan.decision entries whose terminal transitions extinguish pending flags; quiescence completes (nothing running and nothing ready). The end-to-end revise-mid-run shape and a full crash-resume with zero live calls and no duplicate entries are covered by integration tests against the public engine API.
- f4e70be: M7-T07: reuse-by-reference (DEF-5). Core: new `journal/reuse.ts` with the rich `DonorRef` (replacing the M6 seq placeholder inside the closed AdmitVerdict union), `GraftBoot`, `DedupNote`, `ReuseConfig`, `NodeLinkValue` and its content identity (`nodeLinkKey` over {kind, spawnKey, donorScope, targetNodeId}), the `DedupIndex` pure fold (severed roots become donor candidates when their pre-abandon effective status is not error, memoized failures excluded, exclusive claims resolve first-wins, plan-node scopes sweep their own branch payments, unpinned worktree donors degrade), `evaluateReuse` with the four-outcome verdict table (reuse_full | admit_graft | fresh-with-note | reject osc_guard at the link count), and the abandoned-spend ledger fold (abandonedUsd/reclaimedUsd/netLostUsd, per-key oscillation counts). The kernel matcher gains scope-prefix aliasing (docs/03 9.5): `registerAlias` merges donor-scope candidates into the target scope in journal order at every nested level, and the alias disposition bypasses the abandon overlay so donor entries regain their pre-abandon status ONLY through the alias (the standalone old scope stays skipped); a dangling donor root through the alias IS the graft frontier (rerun-dangling continues from the donor checkpoint). `AbandonAttempt` carries logicalTaskId (XF-04); the extension IO gains `abandonBranch`, `registerAlias`, and `priceUsd`. Plan: PlanRunner wires the DedupIndex at the fold head under the PlanWriteLock into the rebase dedup hook (transforms embed the verdict, the donor descriptor, and the placement into the revision entry), applies the per-SpawnKey osc_guard rejection, attaches DedupNotes to fresh admits, compiles applied cancel_task (and cancel-landed) into severing abandon entries with lineage attribution, lands node.link entries and by-ref roots in the mandatory write order with idempotent roll-forward, registers aliases (rebuilt by fold at boot), completes full-linked nodes by reference through an engine decision instead of a dispatch, debits a spawnUnit per reuse link, and renders the abandoned-spend view in plan_view (pinned) and the WakeDigest extras; `PlanRunnerOptions.reuse` carries the docs/03 9.9 config.
- 75d1646: M7-T08: park and unpark. Core: the internal boot-checkpoint channel lets a FRESH dispatch boot from a retained transcript checkpoint (`ExtensionDispatchSpec.bootCheckpointRef`; dangling redispatch checkpoints take precedence), serving park/unpark continuation and the DEF-5 graft boot. Plan: new `park.ts` with the `PinLedger` fold (live pins counted from abandon entries carrying retainWorktree, park pinning and DEF-5 retention SHARE `maxPinnedWorktrees`, default 4), `parkDispositionOf` (checkpoints always retained; worktrees pinned only under capacity, overflow keeps the checkpoint but drops the tree), and `unparkPlacementOf` (continuation from the retained checkpoint; restart when no checkpoint exists or a worktree-isolated node lost its tree: silent resume against a fresh tree is impossible). PlanRunner lands parks at the turn boundary: a park-requested running child is aborted, the `park-landed` plan.decision transitions running to parked carrying the checkpoint anchor (set_node_status gains the optional checkpointRef field, applied by the fold), the branch is severed with retainCheckpoint plus retainWorktree per the pin disposition, the dispatch slot frees for the unpark, and node:parked emits. unpark_task applies with the embedded admission: a previously dispatched branch is a lineage rebirth (relation 'unpark-restart' continuing the node's LTID), while a never-started parked node resumes scheduling without consuming an attempt; the unparked dispatch boots from `checkpointRefFor(runId, anchor)` on the continuation path and restarts otherwise. The park-unpark integration test drives the full shape deterministically (one paid tool turn, park inside the second turn, unpark continuation whose booted history carries the paid turn) plus the pin-cap overflow and placement rows as units.
- 0627413: M7-T10: ModelLadder full (docs/07 section 10; docs/04 section 12; FR-119/FR-313). Core: ladders now RESOLVE through the chain (`canonicalizeLadder` validates the declaration once, FR-119 undeclared-judge-rung ConfigError included, and resolves every rung's effort explicitly; `ladderRungChoice` yields the concrete per-rung ModelChoice; a higher concrete layer shadows a lower ladder and vice versa; a ladder that WINS wire resolution stays a typed ConfigError since rung attempts always carry a concrete override). `ladderLengthOf` reads the normative declaration points (profile `model: { ladder }` or the loop-role routing entry). `foldTermination` debits the rung RESPAWN's embedded admission on raising ladder verdicts (docs/07 11.3 b). New per-engine mechanical gate registry `defaults.gates` (`MechanicalGateProfile` over AgentResult.artifacts). The extension seam gains `io.random` (journaled ctx.random for spot-checks), `io.gates`, and dispatch fields `model` (the concrete rung resolution entering the attempt's identity hash), `memoizeOutcome`, and inline `schema` for the engine-synthesized judge. Plan: new `ladder.ts` plus the PlanRunner ladder driver: rung attempts are ordinary agent scopes on the concrete rung model with rung caps binding (tier N+1 = new content key = one live attempt, all sharing the LTID via relation `rung-retry` registered from the raising verdict's `nextAttempt`); triggers classify typed (error, limit, schema-exhausted, no-progress first-class via the abort class, verify-failed from gates only); acceptance gates run per ok attempt in declaration order with journaled `gate-verdict` decisions (mechanical registry profiles, judge on a declared rung >= the executing rung or explicit override with a forced verdict schema and derived identity, spot-check selection strictly via the journaled draw); every ladder verdict is a decision entry computed once live and recovered by content key, so folds consume only journaled values; a denied respawn writes `termination.denied` strictly before the fallback lands; an ok attempt whose acceptance fails with no raise left lands `failed`, never `done`. Mid-flight resume redispatches running nodes through forward matching (dangling attempts continue, settled ones replay instantly): the half-escalated-ladder shape resumes without repaying completed rungs, proven by the truncated-journal test.
- 55c0f87: M7-T11: EscalationProtocol completion (docs/07 section 6; DEF-2/3/4). Core: Flavor B now REQUIRES an explicit `deadlineMs` (the knob has no engine default per the frozen Appendix A row; a flavor B spawn without it is a typed ConfigError before any LLM call); SpawnRecord captures the dispatch's escalation flavor and the WakeDigest escalations block reports it (a flavor B report reaching the digest is already decided by the DEF-4 winner). Plan: new `escalation.ts` with the authoritative `escalation-decision` entry contract (decide-once per report by content key; `countsAgainstLimit` derived from the report kind, XF-06; the counting debit atomic with the append embedding `escalationUnitsAfter`; a DENIED debit writes `termination.denied` strictly before and flips the entry to `capExceeded` with `countsAgainstLimit: false`, so the cap yields the flagged decision plus the final report, never a bare limit, and the folds stay replay-strict). PlanRunner completes the decision flow: the `cancel_task` revision transform on an escalated node lands the verdict `cancel` decision, the `resolve_escalation` plan.decision (origin `escalation-live`), and the severing abandon strictly after the revision append; a settled Flavor B suspension's DEF-4 winner (timeout `defaultDecision` by `timeout`, a live decision, or a class fan-out) is absorbed into the authoritative entry (origins `escalation-default`/`escalation-class`) and the fate applies through the single applier (retry re-opens the node in place with the journaled `amendedPrompt`/`startTier` honored at re-dispatch, accept closes the paid partial result done, cancel closes cancelled, decompose leaves the node escalated while the proposed children enter through `spawn_admitted` ops with FRESH lineages and embedded admissions debiting spawn units through the decision entry).
- fd33871: M7-T12: orchestrator cap and finalize reserve (DEF-7; docs/07 section 12). BREAKING for PlanRunner runs (v0.8.0 registry, docs/12): `orchestratePlanned` now REQUIRES a resolvable orchestrator cap; a run with no USD ceiling and no explicit `budget.capUsd`, or with `effectiveCap < finalizeReserve`, refuses to start with a typed `OrchestratorCapConfigError` BEFORE the first LLM call and before any journal entries (an uncapped orchestrator was precisely the defect; `capFraction` up to 1.0 opts out explicitly). `effectiveCapUsd = min(capUsd, capFraction x runCeiling)`, default fraction 0.2. The engine writes ONE `orchestrator_budget_reserve` decision entry strictly after `termination.init` and strictly before the orchestrator's first agent entry, freezing the cap and the finalize reserve (explicit, or `finalizeTurns` x the deterministic per-turn estimate) in absolute dollars, recovered by content key on resume and never re-evaluated. The reserve registers on the orchestrator account AND the run root (kept separate from committedReserve; the admission block checks add it), so no spawn ever eats the finalization money. At the pre-wake soft boundary (`orchSpent + turnEstimate > effectiveCap - finalizeReserve`) the engine writes exactly ONE `orchestrator_budget_cap` decision strictly before any effects (an in-flight latch closes the wake-ordinal race): the plan freezes for adaptation but not for work (the rebase context `frozen` flag drops every op `plan_frozen` while admitted nodes run to completion), all wake triggers except quiescence disarm, and the orchestrator unwinds to the reserved FINAL wake: a fresh agent entry on the restricted single-`finish` toolset with a `finalizeTurns` limit, paid from the reserve; success yields outcome `ok` with `forcedFinish` marked in the CostReport. If the final finish fails, `orchestrator_finalize_fallback` journals and the engine SYNTHESIZES a deterministic partial result by pure fold with zero LLM calls; the run ends `exhausted` with the non-null partial (`RunOutcome.value` now survives exhaustion). Every digest carries the `WakeBudgetBlock` (run and orchestrator spend, cap, reserve, the epsilon-floored orchestrator share, `softWarning` at 0.8) with `orchestrator:budget` telemetry at each wake boundary and at the cap; `CostReport.orchestrator` populates spentUsd, wakes, forcedFinish, and reserveUsedUsd for H-OrchShare.
- e70e7f4: M7-T13: the FINAL normative WakeDigest in ONE coordinated schema change (docs/07 section 5; XF-08/XF-12, inside the frozen hashVersion-2 identity rules). `WakeDigest` now declares every block first-class: `digestSeq`, `planHash` (emission-time plan hash, empty outside PlanRunner), `coversToOrdinal`, `completedDigests` ordered by spawn ordinal, `escalations` (with the Flavor B `deadlineAt`), the MANDATORY `termination` snapshot (DEF-2, contributed by the PlanRunner extension as a pure fold), the MANDATORY `budget` block (`WakeBudgetBlock`, DEF-7), and the `reuse` stats (the AbandonedSpendView shape, DEF-5). Runs without the PlanRunner extension ship all-zero blocks (`emptyDigestBlocks`), mirroring the CostReport convention. The digest render is bounded deterministically: the new `renderBudgetChars` option clamps each TaskDigest `outputSummary` by CHARACTERS (the model-independent interim measure; the tokenizer choice stays the docs/14 open question, the numeric default TBD before M10). Pinning semantics are unchanged: the digest is part of the wake snapshot and a re-executed turn reads identical bytes.
- bc9c903: M7-T14: the M7 gating cassettes and the remaining metric wiring (docs/09 sections "Metrics" and "Mandatory defect cassette catalog"). Thirteen frozen cassettes record the round-2 set (revise-mid-run, crash-during-revision, park-unpark, oscillation-freeze, half-escalated-ladder, budget-denied-rung), the DEF-7 set minus queue-failover (cap-freeze-then-finish, crash-between-cap-and-effects, finalize-fallback-synthesized, escalation-storm-frozen), and representative DEF-2/DEF-3 rows (revision-exhaustion, rung-retry-lineage, decompose-mints-children), each double-run at record time and replayed byte-for-byte in CI through the new public `@rulvar/plan` cassette runners with deterministic journal normalization (ULIDs, content hashes, wall clock, spans, and refs collapse to first-appearance placeholders). Metric events: `orchestrator:woke` now carries `planHash`, `coversToOrdinal`, and `renderSize` (the deterministic character measure of the delivered digest, the wake-render-size metric); the escalated landing emits `escalation:raised` with the report kind, the lineage attribution, `agentType` (the escalation-rate slice), and `costToDateUsd`; the abandoned/reclaimed/netLost USD view rides every digest through the T13 reuse block and `ledger:op` plus `spawn:*` events already feed ledger-ops-per-spawn.

### 0.7.0

#### Minor Changes

- fd1d06c: M6-T02: WorkerSandboxRunner and the sandbox contract. `@rulvar/planner` gains `WorkerSandboxRunner` (accepts CompiledWorkflow ONLY; worker_threads with the exact curated 12-global scope; timeoutMs 300000 / memoryMb 512 breaches terminate the worker with the new typed `SandboxError`, code `sandbox_limit`). Core gains the public host half, `createSandboxBridge`: proxied primitives (agent, step, workflow, awaitExternal, parallel, pipeline, phase, budget) served against the canonical run ctx with worker thunks executing under host-allocated scope tokens; the worker's SYNC seeded now/random/uuid (and the Date.now/Math.random replacements) mirror-journal as ordinary kind `rand` entries with match-first resume semantics; a busy-state protocol keeps suspension and quiescence behavior identical to in-process runs. `createEngine` gains `runners.sandbox`; `engine.run`/`engine.resume` accept CompiledWorkflow, persist the source blob plus workflowSourceRef/workflowHash at start, and `resume(runId)` with no workflow rehydrates the hash-pinned source (a differing supplied source is a typed ConfigError). New `FileTranscriptStore` makes compiled runs resumable across processes. The sandbox dialect exposes async `budget.spent()/remaining()`; import/fetch/process are absent from the worker scope.
- 6fcf296: M6-T04: profileCard and the API card. Core gains `profileCard(profiles)`: the one agent vocabulary both orchestration modes speak, feeding the planner prompt (mode b) and spawn_agent agentType guidance (mode c) with IDENTICAL text; pure function of the registry, sorted, byte-stable, rendering only model-agnostic fields (name, description, tool names, taskClass, estCost, escalation opt-in; models are never named). The planner gains `apiCard()`: the byte-stable card teaching exactly the curated 12-global sandbox dialect (schema literals only, tools by profile name, onError throw|null, async budget, no imports, the opts.key repeat rule) with usage patterns distilled from the examples corpus.
- dcc97a9: M6-T05: the plan agent and the self-repair loop (mode b). `plan(engine, goal, { model?, profiles?, repairRounds? })` asks a planner model under role `plan` to write a script against the API card plus the engine's profile card, lints it (eslint-plugin-rulvar preset + compileScript), self-repairs up to repairRounds (default 3) from the machine-readable JSON diagnostics, and returns `{ source, workflow, lint }`. The planner conversation is an ordinary journaled run with a goal-derived deterministic runId, so re-planning the same goal replays the unchanged prefix free; exhausting the rounds throws a typed ScriptRejected carrying the last diagnostics. `runPlanned(engine, goal, args?)` composes plan-then-sandbox-run (async by amendment). Core gains `AgentOpts.role` (`'loop' | 'plan' | 'orchestrate'`, the primary invocation role threading through resolution, effort defaults, floors, cost buckets, and events) and the narrow `Engine.profileCard(names?)` accessor rendering the registered profiles through the public API.
- 434dc83: M6-T06: AdmissionController v1 and nested workflows. `ctx.workflow(wf | 'name', args, { key? })` runs a child workflow under the single admission point: a `spawn-admission` decision entry embeds the closed `AdmitVerdict` union (admit | reuse_full | admit_graft | reject with the merged reject-code set; reuse branches produced from M7), the committed reserve, and statsBefore strictly before the two-phase `child` dispatch entry, so replay recovers verdicts and reserves without re-evaluating admission. Enforced: `maxDepth` (default 1, hard ceiling 4), `maxChildrenPerNode` (16), `childBudgetFraction` (0.3 of the parent remainder minus the parent finalize reserve), and the engine lifetime cap. The budget grows into a hierarchical account tree (run root plus one sub-account per child) with spend propagating to every ancestor, per-account layer-2 guards, and per-subtree layer-3 severing. Structural rejections throw the new typed `AdmissionRejectedError` (code `admission_rejected`); budget-class rejections keep `BudgetExhaustedError` semantics. The string form resolves against `defaults.workflows`; `budgetDefaults` gains `childBudgetFraction` and `maxDepth`, and `flatReserveUsd` is now honored. The abandon fold covers child-workflow scopes via the recorded dispatch payload.
- 03173c1: M6-T07 and M6-T08: the mode (c) dynamic orchestrator. `orchestrate(engine, goal, { model?, profiles?, maxSpawns?, budget?, limits? })` and `ctx.orchestrate(goal, opts)` share one implementation: an ordinary workflow whose agent (role `orchestrate`) holds the typed toolset with the normative docs/07 schemas: `spawn_agent`, `parallel_agents`, `await_any`, `await_all`, `cancel_agent`, and the loop-terminal `finish` (a new engine interception alongside escalate). Every spawn is an ordinary kind `agent` entry under the orchestrator's `agent:<seq>` scope, admitted through the single AdmissionController with the verdict, evaluated reserve, and statsBefore embedded in a `spawn-admission` decision entry (the budget debit itself rides the child's dispatch: one debit, never two); rejections surface as typed tool errors and never kill the run. Handles ARE the child dispatch seqs and stay stable across resume: a crashed orchestrator restores its transcript from the mandatory turn-boundary checkpoint, rebuilds its spawn records from the journal, redispatches only what was in flight, and finds settled children by content keys with zero re-paid spawns and no duplicate spawn decisions. `await_any`/`await_all` deliver deterministic TaskDigests; `cancel_agent` aborts an in-flight child to a `cancelled` terminal (caller intent; abandon coverage arrives with M7 cancel_task). The nested surface rides ctx.workflow, so maxDepth and the budget account tree clamp it for free; the orchestrator gets its own budget sub-account when a cap resolves (reserve decisions and the at-cap freeze are M7, DEF-7).
- 11c0afc: M6-T09 and M6-T10: wait_for_events, the WakeDigest substrate, and ctx.brief. `wait_for_events` (the normative docs/07 4.8 schema) parks the orchestrator on an ordinary DEF-4 suspension; the closed v1 trigger vocabulary is quiescence (always armed), child_terminal, escalation, and budget_threshold at the fixed 50/80 percents; a REQUESTED trigger set that can never fire (no run ceiling, unknown or fully delivered handles, no live children) is an immediate typed tool error, so an embedded run cannot hang unrecoverably. The wake is the closing resolution whose value IS the coalesced `WakeDigest` (substrate fields: digestSeq, coversToOrdinal, completedDigests ordered by spawn ordinal, escalations with reportRef): a re-executed post-crash turn reads exactly the same digest bytes, replay never rebuilds a digest, and simultaneous ready triggers journal one applied resolution plus noop losers under first-closing-wins. Trigger evaluation runs at arm time and on every child settlement; the orchestrator sleeps between wakes and its context grows O(wakes). `ctx.brief({ content, instruction?, model?, agentType? })` is a journaled summarize-role invocation (one agent-kind entry, free on replay) for handing an inheritable brief to a child.

### 0.6.0

#### Minor Changes

- fa05007: M5-T01 workflow registry and the @rulvar/cli base.

  - `@rulvar/core` gains the per-engine `WorkflowRegistry` type and
    `defaults.workflows` on createEngine (docs/06 section 10.4): an
    explicit first-class value, no module-level registry; shells resolve
    by-name runs against it (ctx.workflow's string form arrives M6, the
    queue worker M8).
  - Spec-conformance fix: the M4-T09 quality floors option moves from the
    createEngine top level to its canonical home `defaults.roleFloors`
    (docs/06 section 10.1). Update `createEngine({ floors })` call sites
    to `createEngine({ defaults: { roleFloors } })`.
  - `@rulvar/cli` ships its first real surface: the canonical grammar
    `rulvar run <file|name> [--args JSON] [--store PATH] [--budget-usd N]`,
    `rulvar resume <runId> [--args JSON] [--store PATH]`,
    `rulvar runs ls [--store PATH]`, `rulvar inspect &lt;runId&gt; [--store
PATH]` (no aliases), a line-oriented TUI progress renderer over the
    event stream, and interactive resolution of suspended approvals and
    externals (EOF leaves the run suspended, never errors). Engine
    assembly follows the host-config convention: `rulvar.config.mjs`
    default-exports `{ engineOptions?, workflows? }`, a workflow module
    may export `workflow`/`engineOptions`/`workflows`, and --store selects
    the JsonlFileStore directory (default `.rulvar`), so the CLI itself
    depends only on @rulvar/core. The `rulvar` bin is included; the
    resume/inspect grammar amendment (--args re-supply, --store symmetry)
    is recorded in docs/06 section 10.5.

- 9234dc8: M5-T03 cost reports. The CostReport builder moves to its own module
  (`engine/cost-report.ts`) and report totals become the LEDGER FOLD
  totals at settle: RunOutcome.usage and cost.totalUsd are computed from
  the journal's terminal entries (the same summation the kernel budget
  seed uses), so report totals equal ledger fold totals exactly, live and
  across resume, by construction. The new `costReportFromJournal(entries,
priceUsd)` is the pure fold for STORED runs: byModel and totals from
  terminal servedBy with abandoned subtrees contributing zero; phase,
  agentType, and role attribution are live-run facts that entries do not
  carry (byRole and the orchestrator block complete in M7 per DEF-7).
  Unpriced models keep surfacing, never as silent zeros. `rulvar inspect`
  gains the cost view (total, byModel, unpriced) over the config-assembled
  price function (table wins over caps.pricing), and live run output
  prints the byModel/byPhase buckets.
- 644512c: M5-T05 permission presets, audit, dry-run and M5-T06 argv shell matcher.

  - `compilePermissionPreset('strict' | 'standard' | 'open')`
    (`tools/presets.ts`) compiles the shipped presets to the documented
    verdict-by-risk tables and folds INTO the existing deny/ask chain
    layers, after host-authored rules, never a fifth layer and never an
    allow-override (a needsApproval tool still asks under every preset).
    `open` compiles to empty tables. `AgentProfilePermissions.preset` now
    compiles instead of throwing; undeclared tool risk is matched
    conservatively via a first-class `{ risk: 'undeclared' }` rule.
  - The argv shell matcher (`tools/shell-matcher.ts`) replaces the M5
    fail-early stub for `{ tool, argv }` rules: a POSIX-like lexer honors
    quotes and escapes with no expansion, splits on `;`/`&&`/`||`/`|`/`&`/
    newline, poisons segments containing command or process substitution
    or here-docs to ask, strips leading env assignments, and retains
    redirections as tokens. Verdicts compose strictest-across-segments, so
    `npm test; rm -rf /` yields deny (or ask) even with `npm test`
    allow-listed, and any unmatched segment yields ask.
  - `evaluatePermission` gains an offline overload (by tool name, no
    execution) for the docs/08 4.5 dry-run/shell-tooling API, and every
    verdict carries the audit payload (verdict, deciding layer, matched
    rule) that now rides `tool:end` events; advisory network-domain rules
    are reported there but never enforced outside first-party fetch
    (honest posture, docs/08 4.4).

- 8a41656: M5-T07 RunProfile presets and M5-T08 OTel exporter.

  - `engine/run-profiles.ts`: `RUN_PROFILES` (fast/standard/deep/ultra) and
    `runProfile(name)` ship the presets as pure DATA, bundles of per-role
    effort hints, per-run concurrency, budget, permission preset, and
    spawn limits, with no functions and no named model strings (named
    strong defaults stay in the umbrella). They are never engine
    semantics: a source-scan test asserts the engine has zero branches
    keyed on profile names. `rulvar run --profile <name>` applies the
    chosen profile UNDER the host's own engine options (host always wins;
    the engine then sees only ordinary options), compiling the profile's
    permission preset into the engine deny/ask layers as data.
  - `@rulvar/cli` gains `toOtel(run, tracer)`: it maps a settled run's
    spanId tree 1:1 onto OpenTelemetry spans (run > phase > agent > tool >
    child), with rulvar.* and gen_ai.* attributes, start/end timestamps
    from the lifecycle events, and payload-only events attached as span
    events. Prompts, completions, and tool payloads are NEVER exported;
    replayed events never create duplicate spans. `@opentelemetry/api`
    ^1.9 is an optional peer dependency and the exporter is typed against
    a minimal structural TracerLike, so an absent OTel package never
    breaks the CLI.

#### Patch Changes

- 02f7f7a: M5-T09 examples corpus. A new (unpublished) `examples/` vitest project
  ships runnable reference implementations of the documented quality
  patterns as recipes over the public `ctx` API, never engine flags:
  adversarial panel (N independent skeptics prompted to refute; majority
  survives), judge panel (N angled attempts each scored; top wins),
  loop-until-dry (keep finding until K consecutive empty rounds), and
  completeness critic (draft, then gap-driven revision passes). Each
  example is a real `defineWorkflow` and doubles as an integration test
  under FakeAdapter with zero live calls, so an example that stops
  compiling fails CI like any test. The corpus is registered in the
  pnpm workspace and the single Vitest project set; the umbrella marker
  package is unchanged (patch to carry the changeset).

### 0.5.0

#### Minor Changes

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

- 46ca98e: M4-T03 compaction ownership. The Agent Runtime owns compaction
  (`runtime/compaction.ts`):

  - Compaction is ON by default for every agent at threshold 0.8 of the
    loop model's contextWindow (docs/06 Appendix A);
    `AgentProfile.compaction.threshold` adjusts it per profile. The
    context estimate is the last loop turn's inputTokens + outputTokens.
  - At a tool turn boundary past the threshold the summarize role fires
    through the resolution chain (falling back to the loop model when
    routing resolves no summarize model; the low role-effort default
    applies either way), and the transcript after the first message is
    replaced by one user-role summary message. The summarize request is
    projected like any other and carries the tool contracts with
    toolChoice 'none'.
  - Compaction points (the turn numbers at which compaction fired) ride
    every checkpoint and restore verbatim: a resumed run continues from
    the compacted history and never re-summarizes it. Full-journal replay
    stays free as before.
  - A failed or empty summarize disables compaction for the rest of the
    run with a warning instead of failing paid work; budget and
    cancellation aborts propagate normally.

- 8ae129e: M4-T04 failover and M4-T05 RetryPolicy under the journal.

  - Transport RetryPolicy (`model/retry.ts`): the Appendix A defaults
    (attempts 3; backoff 500ms x2 max 8000ms with equal jitter; retryOn
    transport, rate-limit, overloaded) now actually retry around every
    adapter.stream dispatch: loop turns, extract, finalize, and summarize
    alike. Retries live UNDER the journal: a retried-then-successful call
    is one journal entry with one usage total, one turn, and no lineage
    attempts (DEF-3). A provider retryAfterMs replaces the computed
    delay; task-class failures never retry by construction; stream-idle
    severance retries as transport-class. Configure per call
    (`AgentOpts.retry`), per profile, or engine-wide
    (`defaults.retry`).
  - Transport failover (`model/failover.ts`): `ModelChoice.fallbacks`
    now works. When a serving model exhausts its tries on a transport or
    rate-limit failure, the sticky chain advances to the next resolved
    fallback (per-phase, effort defaults and caps scrubbing re-applied
    per serving model). The content key hashes the REQUESTED spec, so a
    failover-served response replays for free; only `servedBy` records
    the actual server (now surfaced on AgentResult and stamped on the
    terminal entry). Budget is explicitly excluded as a trigger.
  - The degenerate fallback field (`AgentOpts.fallback`, docs/04 11.3):
    an agent-level second attempt on a stronger model when the terminal
    matches `on` (error, limit, schema-exhausted), with exactly one
    journaled decision entry (`decisionType: 'model.fallback'`) reused on
    resume, and the fallback attempt under its own content key. Cancelled,
    escalated, and budget outcomes never trigger it.

  `AgentResult` gains the required `servedBy` field (additive for
  consumers reading results; literal constructions in tests need the new
  member).

- d1c4525: M4-T06 versioned price table and M4-T07 per-provider concurrency keys.

  - `model/pricing.ts`: `PriceTable { pricingVersion, models }` configured
    via `createEngine({ pricing })`. The table wins over adapter-reported
    `caps.pricing` (a fallback only); unpriced models keep surfacing in
    CostReport, never as a silent zero. Engine-written `model.fallback`
    decision entries pin the active `pricingVersion` so replayed cost
    attribution is stable against later table bumps; a price update is a
    registry update with a version bump, never a caps refresh side effect
    (`refreshCaps()` remains the adapter-level caps path).
  - `model/concurrency.ts`: `KeyedLimiter`, engine-scoped, configured via
    `createEngine({ concurrency: { perProvider } })` per adapter id. The
    Appendix A default stays unlimited: the per-run semaphore remains the
    only default bound and provider 429s ride RetryPolicy. When
    configured, every wire dispatch (retries and failover re-acquire)
    gates under its serving adapter's key, adapters throttle
    independently, and queueing surfaces as agent:queued telemetry with
    the provider key. There is deliberately no distributed cross-process
    limiter (docs/14).

- b840aba: M4-T08 canonical effort completion and M4-T09 role quality floors.

  - Effort semantics are complete: the role effort defaults and the
    per-adapter mapping tables (Anthropic passthrough including max,
    OpenAI max downmapped to xhigh and recorded in providerMetadata,
    provider none only via namespaced providerOptions) shipped earlier
    milestones; this change completes VISIBLE scrubbing everywhere it was
    still silent: the summarize invocation surfaces its scrubs at fire
    time and a failover takeover surfaces the fallback's scrubs the
    moment it starts serving. Scrubbed effort is never mapped into
    max_tokens.
  - The effort-defaults-shift cassette is now RECORDED through the live
    runtime (docs/10 M4 gating row): the frozen v1 prefix, closed offline
    the way an operator would, resumes live under explicit high effort
    with the completed semantics; every v1 entry matches and the one new
    spawn carries canonical effort in v2 identity. The recorder output is
    pinned byte-for-byte by the frozen-drift suite and the fixture lock
    now covers 18 files.
  - Quality floors (`model/floors.ts`, M4-T09): per-role and
    per-declared-taskClass allow/deny lists supplied via
    `createEngine({ floors })`, enforced INSIDE the router at resolution,
    before any live call and before any journal entry, for every
    invocation the chain produces (primaries, failover fallbacks, and the
    summarize fallback alike). `AgentProfile.taskClass` declares the
    class; unclassified profiles see only byRole floors. A violation is a
    typed ConfigError.
  - The umbrella `rulvar` package now ships floors opinions next to its
    strong routing defaults: `recommendedDefaults.floors` pins orchestrate
    and plan to strong named models. The core itself ships no named model
    strings, and the umbrella suite enforces that with a source scan.

### 0.4.0

#### Minor Changes

- dfe03b5: M3-T11 gating cassettes and the v0.4.0 BREAKING release notes.

  BREAKING (pre-1.0 convention, docs/12): `AgentStatus` now produces
  `'escalated'` at runtime and `AgentResult` carries the optional
  `escalation: EscalationReport` field (present if and only if the status
  is escalated). This is the third kernel amendment of the replay
  predicate (escalated-replays-as-ok, DEF-1) whose table row shipped
  frozen in M2; the producers ship here. Migration: add an `escalated`
  branch to every switch over `AgentStatus`; consumers not adopting the
  protocol are advised to map `escalated` to `limit` (paid partial work,
  output null, the report stays available for logs). `isEscalated` and
  `EscalatedResult` are exported for narrowing. Status production stays
  gated by opt-in: workflows that never pass `escalation` options cannot
  observe the new status at runtime.

  Cassettes: the DEF-1 live set (escalate-replay,
  crash-between-report-and-decision, flavor-b-timeout) is recorded through
  the live runtime and replayed strict; the M2 synthetic DEF-1 subset is
  re-recorded (memoize-classifier fully live; abandon-subtree through the
  kernel write APIs with a realistic escalated child report and an
  authorizing owner cancel decision; both re-record again with the
  orchestrator producers in M7). FakeAdapter gains fakeToolCalls and
  fakeWireError responder markers; replayRun gains the onEscalation
  pass-through so replay tests can prove the hook stays cold. The
  deliberate fixture regeneration updates fixtures.sha256 in the same
  change (the identity profile is UNCHANGED; this is the docs/10 M3-T11
  ordered re-record, not an identity-pipeline revision).

- d2089a7: M3-T02 turn-boundary checkpoints. The runtime writes a canonical-history
  checkpoint into TranscriptStore at every turn boundary where the loop
  continues (tool boundaries and schema re-prompts), at a deterministic ref
  derived from the dispatch seq; the terminal entry records checkpointRef.
  A dangling-dispatch resume (kill-and-resume) re-enters at the last
  boundary with zero re-paid turns, restored usage folds into the terminal
  exactly once, and an unreadable or unknown-format blob falls back to a
  full redispatch (tools stay at-least-once between execution and the
  checkpoint write). The blob format is engine-internal with a leading
  format byte; replayed agents recover their turn count from the checkpoint
  and re-emit tool:start/tool:end with the replay marker.
- 3f60234: M3-T07 terminal escalated status and EscalationProtocol producers (the
  BREAKING section for v0.4.0 rides the milestone release notes). Typed
  EscalationKind/EscalationReport/EscalationDecision/EscalationOptions;
  the escalate tool registers under escalation opt-in of either flavor
  through the same path as any tool (opting in changes toolsetHash by
  design) and is engine-intercepted after the permission chain. Status
  production is gated: without opt-in the escalate tool does not exist and
  'escalated' is physically unproducible. Flavor A terminates the worker
  with a runtime-completed report (costToDate and salvage are never
  model-authored; the request schema rejects them; the full report is
  validated BEFORE append; usage/costUsd/turns/transcriptRef as for ok,
  output null). Flavor B suspends on the approval machinery with a
  journaled deadlineAt (explicit deadlineMs required); a live decision and
  the deadline timer race through the ResolutionArbiter first-closing-wins
  (timeout applies defaultDecision, default accept); dispose collects the
  worktree patch into salvage BEFORE destruction; the terminal escalated
  entry and the authoritative escalation-decision entry follow strictly
  after, with countsAgainstLimit derived once (true iff scope_bigger).
  Replays synthesize the byte-identical report with zero adapter calls and
  read the owner's decision from the decision entry (a crash between
  report and decision pays the decision live exactly once). In ctx.parallel
  an escalated child is a settled outcome that never aborts siblings; a
  plain value-form call opting in requires the onEscalation hook
  (ConfigError before any LLM call otherwise). The in-run minSpend gate
  (M3-T09) rejects early scope_bigger escalations with a bounded "keep
  working" re-prompt; scope_different and blocked_with_evidence are
  exempt and never debit the counter.
- f668890: M3-T05 worktree isolation and M3-T06 openaiCompatible. GitWorktreeProvider
  implements the IsolationProvider seam: acquire creates a detached
  worktree from HEAD or a given ref (non-git host is a typed ConfigError),
  tools receive cwd inside the tree, collect() snapshots changed files and
  a binary patch, dispose removes the tree with keepOnError retention
  under the shared maxPinnedWorktrees cap (default 4). ctx.agent resolves
  isolation call-over-profile into spawn identity, stores the collected
  patch in TranscriptStore, and surfaces it as a kind 'patch' Artifact on
  AgentResult.artifacts and the terminal journal entry, so replays
  reconstruct artifacts with zero live calls; applying the patch stays
  with the caller. isolation 'readonly' is accepted as a declaration (its
  compiled deny rule ships with risk presets in M5).

  @rulvar/openai gains openaiCompatible({ id, baseURL, apiKey?, caps? })
  for Ollama, vLLM, and gateways: the Chat Completions dialect by
  construction, explicit ids so several endpoints coexist (duplicate id
  stays a ConfigError at createEngine), and the most conservative caps
  when unprobed (prompt-tier structured output, no parallel tools, no
  pricing; supplied caps merge over the floor).

- 16d7aa6: M3-T04 MCP ToolSource. `mcp(cfg)` imports Model Context Protocol tools
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
- 6513ce8: M3-T08 no-progress abort class and M3-T10 UsageLimits completion. The
  engine-defined detector implements the committed docs/06 Appendix A
  interim rule (N consecutive turns without tool calls or artifact deltas,
  N = 3, configurable via the new UsageLimits.noProgressTurns knob): the
  abort journals as the agent's terminal entry with status 'limit', the
  dedicated 'no-progress' class marker in the error payload
  (AgentResult.abortClass), and memoizeOutcome stamped by the ENGINE on
  the terminal entry, so it replays on every resume without a live rerun
  regardless of the user's dispatch-time memoize policy (the predicate's
  entry-read consults the terminal stamp first; docs/03 section 6.6
  amendment). Tool-calling turns reset the streak: a working agent never
  trips. UsageLimits is complete: maxTurns, maxToolCalls,
  maxOutputTokensPerTurn, timeoutMs, streamIdleTimeoutMs, noProgressTurns,
  and the run-level deadline each independently produce their documented
  outcome, with per-limit tests including the memoized-limit
  replay/unmemoized rerun predicate integration. The M3-T09 minSpend gate
  gains the accumulation path test (scope_bigger passes once spend crosses
  minSpendUsd).
- 7dad493: M3-T03 permission chain and ask suspensions. The normative layered chain
  (hooks -> deny rules -> ask rules -> canUseTool -> terminal default) is
  the single approval surface for every tool dispatch; hooks run in
  deterministic registration order with modifiedInput substitution; rules
  never yield allow; an explicit canUseTool allow is decisive including
  over needsApproval; argv/domain rules and presets fail early until M5.
  Engine-wide defaults.permissions merges under profile permissions;
  inheritPermissions is carried as data for subagent spawning (mode c).
  An ask verdict journals a suspended approval entry (kind 'approval',
  identity {toolName, post-hook input}, agent child scope) together with
  the turn checkpoint; the run settles 'suspended' with the synthesized
  approval:&lt;seq&gt; key; RunHandle.resolveExternal validates
  { decision: 'allow' | 'deny' } and a denial surfaces to the model as an
  error tool result carrying the reason. An approval round-trip across
  process exit resumes the SAME turn: executed tool results are reused
  from the checkpoint, the resolved decision applies without
  re-suspension, and only post-approval turns are paid live.
- 2bbf180: M3-T01 tool system core plus the M3 entry-gate docs amendment. `tool()`
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

### 0.3.0

#### Minor Changes

- 43444f6: M2-T11/T12: the executable store conformance kit and the M2 gating
  cassettes with frozen fixtures.

  @rulvar/store-conformance ships its first real API: journalStoreConformance
  (A1 append atomicity, A2 total per-run order, A3 read-your-writes, A4
  opaque payload with read-side-only normalization, meta separation, the
  golden fold-state fixture with a frozen reference hash, the decide-once
  oracle, and the abandon-derived-skip fixture) and leasableStoreConformance
  (typed LeaseHeldError on held acquire, monotonic fencing epochs,
  stale-epoch appends rejected and invisible, released leases fenced from
  renew and append, optional ttl/renew-cadence timing checks), plus
  registerConformance for Vitest/Jest and the stableStringify fold-state
  hasher. InMemoryStore and JsonlFileStore pass; deliberately broken stores
  (reordering, normalizing, tearing, fencing-less) fail loudly.

  @rulvar/core kernel closes three DEF-1/DEF-4 gaps the cassettes gate: an
  abandon-covered hanging dispatch derives skipped instead of redispatching,
  abandon-covered operations contribute a zero ledger increment, the resume
  report lists covered entries as skipped (never orphaned), and an abandon
  over an already-resolved suspension folds to a noop with already_resolved
  (first-closing-wins per target, both closer kinds).

  @rulvar/testing ships the M2 cassette suite over committed frozen
  fixtures: the DEF-1 synthetic subset (abandon-subtree, memoize-classifier,
  v1-journal-on-v2), the DEF-4 set (timeout-vs-live-race,
  class-decision-fanout, abandon-then-crash-then-resume,
  abandon-vs-resolution-race, offline-invalid-then-valid,
  double-abandon-idempotent), the DEF-6 six IDs (resume-v1-on-engine-v2,
  resume-v1-with-inserted-call, suspended-v1-resolves-on-v2,
  reject-version-too-old via deriverV0Synthetic, reject-version-from-future,
  effort-defaults-shift), the mandatory mixed-version scenarios
  (ordinal-space split, forward-cursor preference, cross-version
  resolution, the compatibility and never-pay-twice-through-upgrade
  lemmas), and KeyDeriver contract tests against the frozen v2 golden
  identities including the docs/03 worked example. Fixture regeneration is
  deliberate: scripts/record-m2-cassettes.mjs rebuilds, and CI write
  protection (scripts/check-frozen-fixtures.mjs plus fixtures.sha256)
  fails any fixture diff shipped without the explicit bump token (the
  hyphenated compound of hashVersion and bump) in a changeset.

- 279881b: M2-T05/T06: the hashVersion mechanism and the canonical replay predicate.
  Frozen KeyDeriver profiles (v2 current; v1 with the effort-stripping
  projection, round-1 disposition table, and foldDefaults), the per-engine
  deriver registry with extraDerivers validation as the only window
  extender, the side-effect-free compatibility scan raising
  JournalCompatibilityError with sub-codes and hints, versioned matching
  through the registry KeyRing (live calls projected DOWN, incomparable is
  a guaranteed non-match, keys memoized per call and version); the single
  canonical replayDisposition with the three kernel amendments
  (memoizeOutcome on task-class failures via classifyAgentError,
  abandon-derived skipped through the append-order AbandonFold with
  transitive child-scope coverage, escalated-replays-as-ok), version
  dispatch by the entry's own profile, and the invalidate/retry unpinning
  API. @rulvar/compat ships the extraDerivers plumbing plus the synthetic
  hashVersion 0 deriver (manually versioned 0.1.0 per the lockstep
  exemption).
- 9fd0966: M2-T03/T04: scoped forward-matching and the kinds/grammar freeze. The
  JournalMatcher (per-scope insertion-stable cursors, first unconsumed
  match wins, cache/never per-call modes, orphan reporting) integrated into
  the Replayer with seeded seq/ordinal spaces and the resume ledger fold;
  ctx.agent/step/now/random/uuid replay journaled results byte-identically
  with zero adapter calls, dangling running entries redispatch with the
  terminal referencing the original dispatch, and replayed lifecycle events
  carry replayed: true. Kinds registry v2 payload validators enforce the
  docs/03 shapes on engine-written entries; the scope grammar gains a
  parser with round-trip guarantees. The interim disposition is round-1;
  the full DEF-1 table plugs in with M2-T06.
- 24ebadf: M2-T07/T08: suspension machinery (DEF-4). Strict ResolutionPayload and
  AbandonPayload with the normative by-source mapping; the
  first-closing-wins ResolutionFold (schema validation at consumption
  against the schema pinned inside the suspended entry, invalid offline
  resolutions never close, abandon coverage with transitive child
  scope-prefix and the AbandonFold projection consumed by the replay
  predicate); the per-target FIFO ResolutionArbiter (classify, durable
  append, settle exactly once; losing attempts are journaled noops); rule
  O2 hard errors on forward or dangling refs; Replayer
  resolveSuspended/abandonBranch/suspensionState; ctx.awaitExternal (NO
  deadline in v1, duplicate key in scope is a typed error) with run
  outcome 'suspended' plus pending[] on quiescence; and
  RunHandle.resolveExternal returning ResolutionOutcome, validating live
  payloads BEFORE append and journaling nothing on InvalidResolutionError.
- a1b35d3: M2-T09/T10: engine.resume under the run-to-definition binding contract
  (wf required for in-process runs, name mismatch is a typed ConfigError,
  body-hash mismatch warns loudly and proceeds; the compatibility scan
  runs strictly before any side effect; the resumed run seeds the budget
  from the ledger fold, re-emits open suspensions, and reports
  ResumePreview hits/misses/reruns/orphans plus invalid offline
  resolutions), the dryRun option (replay-strict matching: the first
  would-be-live call settles the run with the typed journal_miss error and
  zero live calls), and @rulvar/testing replayRun (tier 3: strict replay
  of any journal with JournalMissError on ANY live call; suspended
  journals finish suspended with zero live calls).
- 18a5821: M2-T01/T02 groundwork: JsonlFileStore (one JSON entry per line, the
  journal doubles as an event log; torn-trailing-line tolerance and repair
  for A1 atomicity; atomic temp-plus-rename meta replace; listRuns without
  payload parsing; mid-file corruption is a hard JournalOrderViolation) and
  the committed large-value soft warn threshold (262144 bytes, docs/06
  Appendix A M2 entry gate) wired into the journal append path as a
  warning event, never an error.

### 0.2.0

#### Minor Changes

- c24228d: M1-T10/T11: the WorkflowEvent envelope and M1 catalog (per-run telemetry
  seq distinct from JournalEntry.seq, span hierarchy run > phase > agent),
  the per-run EventBus feeding RunHandle.events and on(), RunOutcome with
  exhausted-overrides-error precedence and the normative CostReport
  (byModel/byPhase/byAgentType/byRole, the all-zero orchestrator block,
  unpriced evidence); createEngine with per-engine registries and
  engine.run over the ScriptRunner seam; InProcessRunner with the dev-mode
  bare-Date.now/Math.random warnings; run cancellation (host signal,
  handle.cancel, run deadline) and RunMeta run-to-definition binding
  fields. The umbrella ships the minimal terminal progress renderer
  (renderProgress) and re-exports the core surface.
- c50871e: M1-T04/T05: journal write path and model router core. JournalEntry form
  with the kinds registry v2 and hashVersion (written as 2 from day one),
  IdentityInput records per spawn kind with content-key derivation (sha256
  over RFC 8785 JCS; reproduces the docs/03 worked example byte-identically),
  the scope-path grammar, ordinal assignment, the per-run serialized append
  queue with the JSON-serializability check, the budget-ledger fold,
  JournalStore/LeasableStore/TranscriptStore SPI types, InMemoryStore (loud
  one-time resume-disabled warning) and InMemoryTranscriptStore; the
  per-engine adapter registry (duplicate adapterId is a ConfigError), strict
  ModelRef parsing, the per-invocation resolution chain with role effort
  defaults, CanonicalModelSpec canonicalization, visible caps scrubbing
  (effort and sampling parameters), and structured-output tier selection
  with the strict-compatibility predicate.
- 1af8fb9: M1-T01/T02/T03: L0 foundations. Wire contracts (Msg/Part with provider-raw,
  ChatRequest, the ChatEvent union with typed refusal finish outcomes, the
  Usage invariant, CanonicalId minting, cacheHint, canonical five-level
  Effort, the ModelSpec family declarations); the closed error taxonomy
  (RulvarError base, WireError projection, all named error classes, the
  AgentError value projection); SchemaSpec in its three forms with Out&lt;S&gt;
  inference, StandardJSONSchemaV1 projection (draft 2020-12 with draft-07
  fallback), canonical schema derivation (JCS, local $ref inlining,
  annotation stripping), schemaHash/toolsetHash, and runtime validation via
  the vendored draft 2020-12 validator.
- 1fe0249: M1-T06/T07/T08/T09: agent runtime v1 (single subagent loop, structured
  output in three tiers with client validation and the bounded re-prompt,
  typed AgentResult with the ok/error/limit/cancelled/skipped vocabulary,
  ModelRetry declaration, UsageLimits with the normative merge and defaults,
  typed refusal handling, Usage-invariant verification at the adapter
  boundary); ctx primitives (defineWorkflow with the errorPolicy literal
  generic, ctx.agent overloads including result: 'full', ctx.parallel with
  Settled and abortSiblings semantics, ctx.pipeline with up to six stages
  and onItemError drop/throw/collect, ctx.step with useMemo-style deps
  keying, ctx.phase cost attribution, ctx.log, ctx.budget, and the
  deterministic now/random/uuid shims journaled as rand entries); the
  per-run FIFO semaphore scheduler; and the three-layer budget (admission
  reserves, the per-turn guard, the AbortSignal ceiling with usageApprox,
  immutable B0, BudgetExhaustedError thrown uniformly by every ctx
  primitive, run.dropped evidence for every silent loss).
- 5c4fc32: M1-T14/T15: @rulvar/testing tier 1 (FakeAdapter matching on
  agentType/label/prompt regex with a '*' fallback, honoring the selected
  structured-output tier, zero USD by construction; createTestEngine over
  the full real engine with recorded event streams; toHaveCalledAgent and
  toStayUnderBudget matchers at '@rulvar/testing/matchers') and the
  completed umbrella (re-exports of @rulvar/core and both first-class
  adapters, renderProgress, the umbrella-only recommendedDefaults strong
  model slots, the M1 exit-criteria example workflow, and the CI install
  smoke on packed tarballs). The core now populates the reserved
  providerOptions 'rulvar' telemetry namespace on every request (docs/04
  section 1.8 as amended) and AgentResult carries errorMessage detail for
  journaled WireError fidelity.

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

## eslint-plugin-rulvar

### 1.44.0

### 1.43.0

### 1.42.0

### 1.41.0

### 1.40.0

### 1.39.0

#### Minor Changes

- 0cff035: Close the dynamic code generation parity gap in the planner sandbox dialect (v1.38.0 review P2-CODEGEN-PARITY).

  `compileScript` and the `rulvar/no-code-generation` ESLint rule now share one AST policy (`scanDialect`), so both reach the same decision for every statically visible constructor reconstruction form: `.constructor`, `["constructor"]`, a computed key that folds to the constant, `{ constructor: x }` destructuring, and `Reflect.get(fn, "constructor")`. The previous regex compile gate matched only the dotted form, so a bracket or computed key passed compile while the linter flagged some of them; moving to an AST also drops the regex false positives, where a property merely named `eval`, `Function`, or `constructor` was wrongly rejected.

  A key assembled only at runtime (`fn[parts.join("")]`) cannot be decided statically without rejecting every dynamic property access, so the worker realm now neutralizes the constructor reconstruction path at runtime by replacing the `constructor` slot on all four Function family prototypes with a thrower. A script that compiles clean can no longer reach the Function constructor through a dynamic key.

  The planner and orchestration docs are corrected to state the exact boundary: the dialect rejects the statically visible forms and the worker neutralizes the runtime path, but a worker in the same process shares its intrinsics with the code it runs and remains a determinism and blast radius boundary, not a hostile code wall.

### 1.38.0

#### Minor Changes

- 3e2d591: Reject dynamic code generation in the planner sandbox dialect (v1.37.0 review SEC-P2). `compileScript` banned `import` but not `eval`, the `Function` constructor, or `.constructor` access, so a machine script could reach the Function constructor and compile a dynamic import the literal scan never saw, recovering the import allowlist and, through `node:child_process`, arbitrary host capability at run status `ok`. `compileScript` now rejects `eval`, `Function`, and `.constructor` (diagnostic ids `no-eval`, `no-function-constructor`, `no-constructor-access`); a new `rulvar/no-code-generation` ESLint rule carries the same ban into the `workflows` preset and the self repair loop; and the worker additionally unbinds `eval` and `Function` as defense in depth. This keeps the import allowlist meaningful and the dialect consistent. It is not a hostile code boundary, which the sandbox has never claimed to be: JavaScript intrinsics can still reconstruct the constructors, so the docs continue to call the sandbox a determinism and blast radius boundary, not a security one.

### 1.37.0

### 1.36.0

### 1.35.0

### 1.34.0

### 1.33.0

### 1.32.0

### 1.31.0

### 1.30.0

### 1.29.0

### 1.28.0

### 1.27.0

### 1.26.0

### 1.25.0

### 1.24.1

### 1.24.0

### 1.23.0

### 1.22.0

### 1.21.0

### 1.20.0

### 1.19.0

### 1.18.0

### 1.17.0

### 1.16.2

### 1.16.1

### 1.16.0

### 1.15.0

### 1.14.0

### 1.13.0

### 1.12.0

### 1.11.0

### 1.10.0

### 1.9.0

### 1.8.0

### 1.7.0

### 1.6.0

#### Patch Changes

- da4dbad: Write the product name as Rulvar in prose: package READMEs, npm descriptions, and the
  documentation site now capitalize the brand. Identifiers keep their exact casing, so
  package names, the `rulvar` binary, `rulvar.config.mjs`, the `.rulvar` store directory,
  the `rulvar.*` OTel attributes, and every URL are unchanged. Documentation and metadata
  only; no runtime behaviour changes.

### 1.5.2

### 1.5.1

### 1.5.0

### 1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.

### 1.3.0

### 1.2.0

#### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.

### 1.1.0

### 1.0.0

### 0.9.0

### 0.8.0

### 0.7.0

#### Minor Changes

- 4aaf2d5: M6-T03: the determinism rule set with structural JSON diagnostics (docs/06 8.4). Rules: no-bare-date (Date.now and new Date), no-bare-random (Math.random), no-fetch (bare and globalThis.fetch), no-process-env, no-promise-all-over-ctx (Promise.all/allSettled/race/any spawning ctx or bare sandbox calls; ctx.parallel instead), and the duplicate-identical-call advisory (byte-identical ctx.agent/ctx.workflow calls in one function forward-match to one journal entry; opts.key distinguishes deliberate repeats). Locally shadowed globals are never flagged. The flat preset `configs.workflows` wires every rule at its intended severity, and `toJsonDiagnostics` projects lint messages into the machine-readable shape the mode (b) self-repair loop consumes.

### 0.6.0

### 0.5.0

### 0.4.0

### 0.3.0

### 0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

## @rulvar/evals

### 1.44.0

#### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0
  - @rulvar/testing@1.44.0

### 1.43.0

#### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0
  - @rulvar/testing@1.43.0

### 1.42.0

#### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0
  - @rulvar/testing@1.42.0

### 1.41.0

#### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0
  - @rulvar/testing@1.41.0

### 1.40.0

#### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0
  - @rulvar/testing@1.40.0

### 1.39.0

#### Patch Changes

- @rulvar/core@1.39.0
- @rulvar/testing@1.39.0

### 1.38.0

#### Patch Changes

- @rulvar/core@1.38.0
- @rulvar/testing@1.38.0

### 1.37.0

#### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0
  - @rulvar/testing@1.37.0

### 1.36.0

#### Minor Changes

- 101795b: Validate the CAS rebase `attempts` of `commitEvalMeasured` and `flipStaleOnCanaryDrift` as positive integers before the first store read (v1.35.0 review P2). Unvalidated, NaN or a nonpositive count skipped the loop entirely and surfaced the generic `unreachable` Error instead of a typed refusal, while a fraction over ran by an attempt.

#### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0
  - @rulvar/testing@1.36.0

### 1.35.0

#### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0
  - @rulvar/testing@1.35.0

### 1.34.0

#### Patch Changes

- Updated dependencies [f1505ec]
- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0
  - @rulvar/testing@1.34.0

### 1.33.0

#### Patch Changes

- Updated dependencies [3f0f5e8]
  - @rulvar/testing@1.33.0
  - @rulvar/core@1.33.0

### 1.32.0

#### Patch Changes

- Updated dependencies [e366d64]
- Updated dependencies [e366d64]
- Updated dependencies [e366d64]
  - @rulvar/testing@1.32.0
  - @rulvar/core@1.32.0

### 1.31.0

#### Patch Changes

- Updated dependencies [df6b8f8]
- Updated dependencies [df6b8f8]
  - @rulvar/testing@1.31.0
  - @rulvar/core@1.31.0

### 1.30.0

#### Patch Changes

- Updated dependencies [87ce985]
- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0
  - @rulvar/testing@1.30.0

### 1.29.0

#### Minor Changes

- 621d566: Validate eval thresholds before they can classify anything (v1.28.0 review P2).

  `rubricGrader` now throws a typed `ConfigError` at construction when `passThreshold` is not a finite fraction in [0, 1]; previously a negative threshold made every zero score verdict pass. `runSweepMatrix` validates its effective thresholds before `engineFor`, envelope reservation, or any provider and store activity: both bands must be finite fractions in [0, 1] with `weakness` strictly below `strength`, so the bands stay ordered and the uninformative mid band exists. Previously a reversed or out of range configuration turned a failing cell (pass rate 0) into a committed strength claim, which a connected ModelKnowledge store would then feed into routing as false knowledge.

#### Patch Changes

- Updated dependencies [621d566]
- Updated dependencies [621d566]
  - @rulvar/core@1.29.0
  - @rulvar/testing@1.29.0

### 1.28.0

#### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0
  - @rulvar/testing@1.28.0

### 1.27.0

#### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0
  - @rulvar/testing@1.27.0

### 1.26.0

#### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0
  - @rulvar/testing@1.26.0

### 1.25.0

#### Patch Changes

- @rulvar/core@1.25.0
- @rulvar/testing@1.25.0

### 1.24.1

#### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1
  - @rulvar/testing@1.24.1

### 1.24.0

#### Patch Changes

- Updated dependencies [2b033e8]
- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0
  - @rulvar/testing@1.24.0

### 1.23.0

#### Minor Changes

- 1f9c272: PlanRunner spawn telemetry, the missing evals export, and the conformance kit's new meta field (v1.22.0 review P2-5, P2-6, P1-2).

  - `@rulvar/plan`: PlanRunner journals every admission INSIDE a carrying entry (decomposition rows in escalation decisions, ladder-verdict respawns, reuse and graft links, revision admissions) and emitted no `spawn:admitted`/`spawn:rejected` at all; a live PlanRunner run with admitted roots showed an event count of zero. Every embedded admission row now announces through one formatter, identically on the live path and on replay absorb, with `replayed: true` on recovered rows, `entryRef` on the journaled carrying entry, and `agentType` resolved from the landed specs.
  - `@rulvar/evals`: `agentTypeRuleHolds` joins the package root next to `rungRuleHolds`, exactly as the v1.21.0 changelog had already announced; a public-API test now imports the checkpoint quartet from the root. The evals guide gains a full measured-value checkpoint section (ladder/pool/cell/arm vocabulary, both criteria, the vacuous-pass guard, cost discipline, a runnable example).
  - `@rulvar/store-conformance`: the meta round-trip case now also pins the new optional `RunMeta.segments` field, which the engine bumps durably at every resume to keep event `seq`/`spanId` unique per run.

#### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0
  - @rulvar/testing@1.23.0

### 1.22.0

#### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0
  - @rulvar/testing@1.22.0

### 1.21.0

#### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0
  - @rulvar/testing@1.21.0

### 1.20.0

#### Patch Changes

- 9367030: `SpendEnvelope` rejects amounts at or above 2^49 micro-USD (about $562,949,953.42). The 4-ULP representation-noise window grows with magnitude and reaches half a micro-USD at that boundary, where the nearest integer stops being unique: a ceil debit could snap DOWN and admit an aggregate whose raw requests sum above the ceiling (the v1.19.0 review reproduced a sub-micro overshoot at a $570M cap). Out-of-domain caps and ceilings now throw a typed `ConfigError` that debits nothing. The class documents the exact input interpretation (a double within the noise window of an integer micro value IS that integer) and the honest raw-double bound (at most half a micro per admitted amount, the finest distinction double precision carries at the top of the domain); boundary and adversarial ULP-neighbor properties pin both.
- Updated dependencies [9367030]
  - @rulvar/core@1.20.0
  - @rulvar/testing@1.20.0

### 1.19.0

#### Patch Changes

- 8cc9a9c: `SpendEnvelope` directed rounding survives dollar magnitudes and rejects out-of-domain amounts. The previous conservative-rounding fix snapped to the nearest integer micro-USD within a RELATIVE 1e-6 tolerance, which already reaches half a micro at $0.50 and turns directed rounding into round-to-nearest: two $0.5000004 authorizations (true sum $1.0000008) both fit a $1 cap, a $0.5000006 cap admitted a $0.500001 debit, and a `Number.MAX_VALUE` cap overflowed to `Infinity` micro where every authorization is admitted and `remainingUsd` is `NaN`. The snap window now scales with the ULP of `usd * 1e6`, so only genuine IEEE-754 representation noise snaps (0.1 + 0.2 against a 0.3 envelope stays a fit) while real sub-micro fractions keep the conservative floor (caps) or ceil (debits), and after conversion both the cap and every ceiling must be safe integers in micro-USD (at most $9007199254.740991), rejected otherwise with a typed `ConfigError` that debits nothing. Property tests now cover dollar magnitudes and the domain edges.
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0
  - @rulvar/testing@1.19.0

### 1.18.0

#### Minor Changes

- 943962d: `SpendEnvelope` is now provably conservative at the representation boundary. Nearest rounding on both the cap and the debits let any positive ceiling below $0.0000005 round to a zero debit, admitting an unbounded number of authorizations past `maxTotalUsd`. Accounting stays integer micro-USD, but the cap now converts down (floor), every debit converts up (ceil, minimum one micro-USD), and a `maxTotalUsd` below $0.000001 is rejected as a `ConfigError`, so for any admitted sequence the sum of the original ceilings can never exceed `maxTotalUsd` and no positive ceiling ever debits zero. Amounts that are integer micro-USD up to float noise stay exact (0.1 + 0.2 against 0.3 remains a fit). Migration: an envelope constructed with a sub-micro cap now throws instead of admitting everything, and sub-micro ceilings now consume a full micro-USD each.
- 943962d: Sweep and suite reports are now monotone: paid evidence survives every budget refusal. Previously `runSweepMatrix` caught the envelope's `SweepBudgetError` around a whole cell and replaced it with an empty `envelopeExhausted` row, erasing already completed targets and their cost; a judge refused by the envelope erased the paid successful target the same way; and a judge run that hit its own per-run ceiling threw `EvalJudgeError` out of the entire matrix, losing every accumulated cell.

  Now: `runEvalSuite` returns partial results with `plannedN`, `completedN`, and a typed `refusal` marker instead of throwing when the envelope refuses a target; a judge budget event (per-run ceiling exhaustion or envelope refusal) normalizes into the owning `EvalCaseResult` as `incomplete: { reason: 'judge-exhausted' | 'judge-refused' }` with the failing judge run's actual cost counted, while non-budget grader errors still throw; `SweepCellReport` gains `plannedN`, `judgeIncompleteRuns`, `incompleteReason`, and `refusedRunLabel`, and any incomplete cell (n < plannedN, exhausted targets, unfinished judges, or an envelope refusal) emits no claim; `runCanary` records an envelope-refused probe as `status: 'refused'` and keeps walking, so completed probe evidence survives and `allOk` stays the drift-flip gate; `EvalJudgeError` carries `costUsd`. The `kb sweep` human renderer prints incomplete cells explicitly (`INCOMPLETE: envelope refused ... after N of M case(s)`, unfinished-judge counts, refused-probe counts) instead of pretending nothing ran.

  Migration: `runSweepMatrix` and `runEvalSuite` no longer throw `SweepBudgetError` for refused targets or judges; read `EvalSuiteResult.refusal`, `EvalCaseResult.incomplete`, and the new cell fields instead. Cells now always carry `plannedN`.

#### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0
  - @rulvar/testing@1.18.0

### 1.17.0

#### Minor Changes

- 7909b6b: Budget surfaces for sweeps and the canary (the v1.16.2 review P1-2).

  - New `SpendEnvelope(maxTotalUsd)`: the debit-only aggregate bound over a whole sweep. Every target, judge, and canary run authorizes its immutable per-run ceiling against it BEFORE starting (integer micro-USD accounting, so exact fits pass); a refusal throws the new `SweepBudgetError` before any provider work, and authorizations are never returned, not on completion, not on replay, not on CAS retries.
  - `runEvalCase`, `runEvalSuite`, and `runSweepMatrix` accept `envelope`; an envelope requires the matching per-run ceiling (`budgetUsd`, and `judgeBudgetUsd` once a grader judges), because an unbounded run under an aggregate envelope would be unaccountable.
  - Sweep cells now separate measurement from budget artifacts: a cell the envelope refused reports `envelopeExhausted`, a cell whose target runs hit their own ceiling reports `exhaustedRuns`, and neither emits a claim, so a budget-starved measurement can never become a false weakness belief about the model.
  - New `runCanary(engine, probes, { budgetUsd?, envelope? })` returns `{ fingerprint, allOk, probes }`: each probe run carries the optional immutable ceiling, and `allOk` is the drift-flip gate, because a non-`ok` probe fingerprints differently without the model having drifted. `canaryFingerprint` stays exported (now accepting the same options) for fingerprint-only callers.

#### Patch Changes

- @rulvar/core@1.17.0
- @rulvar/testing@1.17.0

### 1.16.2

#### Patch Changes

- @rulvar/core@1.16.2
- @rulvar/testing@1.16.2

### 1.16.1

#### Patch Changes

- @rulvar/core@1.16.1
- @rulvar/testing@1.16.1

### 1.16.0

#### Patch Changes

- Updated dependencies [5f76cf2]
  - @rulvar/testing@1.16.0
  - @rulvar/core@1.16.0

### 1.15.0

#### Patch Changes

- Updated dependencies [4aee1f3]
  - @rulvar/testing@1.15.0
  - @rulvar/core@1.15.0

### 1.14.0

#### Patch Changes

- Updated dependencies [6073226]
  - @rulvar/testing@1.14.0
  - @rulvar/core@1.14.0

### 1.13.0

#### Patch Changes

- Updated dependencies [c28c4c0]
  - @rulvar/testing@1.13.0
  - @rulvar/core@1.13.0

### 1.12.0

#### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0
  - @rulvar/testing@1.12.0

### 1.11.0

#### Patch Changes

- Updated dependencies [0c70c5e]
- Updated dependencies [0c70c5e]
  - @rulvar/testing@1.11.0
  - @rulvar/core@1.11.0

### 1.10.0

#### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0
  - @rulvar/testing@1.10.0

### 1.9.0

#### Patch Changes

- Updated dependencies [7577f8e]
- Updated dependencies [3a53383]
  - @rulvar/testing@1.9.0
  - @rulvar/core@1.9.0

### 1.8.0

#### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0
  - @rulvar/testing@1.8.0

### 1.7.0

#### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0
  - @rulvar/testing@1.7.0

### 1.6.0

#### Patch Changes

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
  - @rulvar/testing@1.6.0

### 1.5.2

#### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2
  - @rulvar/testing@1.5.2

### 1.5.1

#### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1
  - @rulvar/testing@1.5.1

### 1.5.0

#### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0
  - @rulvar/testing@1.5.0

### 1.4.0

#### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0
  - @rulvar/testing@1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2
  - @rulvar/testing@1.3.2

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1
  - @rulvar/testing@1.3.1

### 1.3.0

#### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0
  - @rulvar/testing@1.3.0

### 1.2.0

#### Patch Changes

- 5ac56b4: Criterion 2 of the measured-value checkpoint gains the quality branch per the founder's OQ-09 amendment (2026-07-12): the card-informed arm passes by matching the baseline pass rate at no more than 105 percent of its cost, OR by beating it by at least 15 points at no more than 115 percent. The reopened gate measured plus 40 and plus 20 points at 107.9 and 106.6 percent: the baseline fails cheaply, so the flat cost bar tightened exactly when the card won on quality. The vacuous-pass guard stands unchanged; the rule now lives in the exported agentTypeRuleHolds next to rungRuleHolds.
- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0
  - @rulvar/testing@1.2.0

### 1.1.0

#### Minor Changes

- 00f1ab5: M12-T01: the measured-value checkpoint harness (docs/05, section "Phases and placement"; the OQ-09 criteria). `runValueCheckpoint` executes the M12 gate as two A/B experiments under one fixed pool: criterion 1 (rung selection) runs every eval case per (ladder, taskClass) cell at the ladder's default start tier versus the tier recommended by `compileVerifiedLayer` over the store's claims, judging each recommended cell by the OQ-09 rule (equal-or-better pass rate at 90 percent of the cost, or five points better at cost) with unrecommended cells neutral for the majority but included in the pooled aggregate; criterion 2 (agentType selection) runs the same orchestrate-role cases with and without the knowledge store and requires the card-informed arm to match or beat the baseline pass rate within 105 percent of its cost. The checkpoint passes only when both hold; `renderCheckpointReport` produces the docs-ready record, and an unmeasured criterion 2 honestly counts as failed. The fixed mixed corpus (extraction, code-edit, judging; a seeded LCG keeps it byte-stable; the seed/eval split prevents leakage into the treatment arm) and the budget-guarded live Anthropic runner ship as repo scripts.

#### Patch Changes

- 63b2c01: Two defects the first live M12 checkpoint run surfaced. The Anthropic capability table lacked a Haiku 4.5 entry, so the dated id fell through to the current-generation default and the adapter sent adaptive thinking, which that model rejects with a live 400 (every haiku run died at zero cost): `claude-haiku-4-5` (and its dated snapshots by the prefix rule) now resolves to the enabled-budget thinking form with real haiku pricing, meaning the default wire omits thinking entirely. And the checkpoint's criterion 2 could pass vacuously when both arms scored zero at zero cost (zero satisfies "at least equal at no more cost"): the card-informed arm must now win something real (nonzero n and pass rate) before the criterion can hold.
- 42050b5: The checkpoint's orchestrated arms take their own suite options (`orchestratedSuite`, defaulting to `suite`): the third live run showed the shared per-case budget starving the orchestrator cap math (a $0.10 run ceiling cannot host the default finalize reserve, so every orchestrate-role run died at OrchestratorCapConfigError before the first model call, at zero cost).
- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0
  - @rulvar/testing@1.1.0

### 1.0.0

#### Minor Changes

- 6649e5f: M11-T01: the eval-committer identity activates eval-measured claims (docs/05, sections "Data model" and "Commit discipline", amended with the dedicated `eval-committer` GateRecord variant, distinct from the v2-reserved eval-confirmed proposal auto-gate).

  - Commit validation is now GATE-DRIVEN and the coherence square is schema-enforced in both directions: an eval-committer-gated op MUST carry class eval-measured, author kind eval-pipeline, and the metrics block; a human-gated op MUST NOT carry any of the three (a human-authored op with metrics keeps rejecting). Observational data never carries metrics and never auto-promotes.
  - `@rulvar/evals` ships the pipeline side: `evalMeasuredClaim` (the docs/05 TTL table applied by polarity: strength 90 days, weakness 30) and `commitEvalMeasured` with the documented CAS-rebase recipe against any ModelKnowledgeStore.

- eaacdeb: M11-T02: matrix sweeps (docs/05, section "Grounding and decay"). `runSweepMatrix` measures a FIXED pool (workflow x model x taskClass; sweep volume is never authorized by proposal volume) through the ordinary engine, sequentially in declaration order for deterministic cassette consumption, and aggregates per (model, taskClass) cell.

  - Threshold-crossing cells emit eval-measured claims (strength at or above 0.9, weakness at or below 0.5 by default; the mid band emits nothing): typed statement templates, metrics {passRate, n, graderId}, EvidenceRef eval reports with the case ids, confidence from n, the docs/05 TTL table from observedAt, and deterministic report-scoped claim ids.
  - With a store given, claims commit through the eval-committer identity (the M11-T01 gate); the sweep e2e records against fake adapters and replays hermetically from the cassette with zero live calls, byte-identical reports.

- 01d6b2d: M11-T04: modelEpoch capture and the canary fingerprint (docs/05, section "Grounding and decay"; OQ-06 CLOSED with the committed design).

  - Core: `modelEpochOf`/`capsHashOf` build the honestly coarse epoch signal (registry version, pricing version, caps hash; silent alias re-pointing stays a documented uncaught case absent probes). The ClaimOp union gains `mark_stale` (docs/05 amended): section 6 requires status stale at fingerprint drift and the closed op set could not produce it; active flips to stale, already-stale is an idempotent noop, terminals never revive.
  - Evals: `canaryFingerprint(engine, probes)` runs the FIXED caller-versioned probe set sequentially through the ordinary engine and hashes NFC-normalized, whitespace-collapsed outputs (the probe count prefixes the hash so probe-set edits never collide with drift). `flipStaleOnCanaryDrift` flips the model's active eval-measured claims whose recorded fingerprint differs, in one CAS-rebased command; claims without a baseline stay untouched. Sweeps stamp the epoch per pool member via `modelEpochFor`.

- e679c6e: M9-T02: the @rulvar/evals base (docs/09 section 7; docs/11 "Eval CI"; FR-5xx). First real public surface of @rulvar/evals, built strictly on the public APIs (L6).

  - `EvalCase = { workflow, args, graders[] }` exactly as documented, with `runEvalCase` and `runEvalSuite` runners: the target workflow runs as its own journaled run; latency is derived from run:start and run:end event timestamps (no separate measurement channel); duplicate workflow names disambiguate by ordinal.
  - Three grader families: `goldenGrader` (deep JSON equality with diff evidence), `rubricGrader` (named pure criteria, per-criterion verdicts, fraction score against a pass threshold), and `judgeGrader` (an LLM verdict against a schema). The judge runs THROUGH the engine via `GraderContext.judge` as an ordinary journaled, budgeted invocation, so judge calls are VCR-recordable and eval CI replays them deterministically with zero live calls. @rulvar/evals ships NO default judge model: weak judge defaults are forbidden by the router quality floors, so `model` is required. Judge invocations are skipped deterministically when the target run did not settle ok.
  - `runEvalMatrix` compares configuration cells (profile vs profile, cheap workers vs premium, reviewer on or off): each cell supplies its own engine and the report carries pass-rate, cost, and latency per cell from the existing usage and cost fields. No failure clustering, no vector dependency (EXC registry).
  - Acceptance held in-suite: a suite recorded through the VCR adapters replays byte-deterministically (latency excluded as the one wall-clock measurement) from the cassette under onMiss 'throw', and the cassette carries its hashVersion header (DEF-6).

#### Patch Changes

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
- Updated dependencies [807d1f9]
- Updated dependencies [596a39b]
- Updated dependencies [464ab6e]
  - @rulvar/core@1.0.0
  - @rulvar/testing@1.0.0

### 0.9.0

#### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0
  - @rulvar/testing@0.9.0

### 0.8.0

#### Patch Changes

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
  - @rulvar/testing@0.8.0

### 0.7.0

#### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
- Updated dependencies [10b45f1]
  - @rulvar/core@0.7.0
  - @rulvar/testing@0.7.0

### 0.6.0

#### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [638d9a1]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0
  - @rulvar/testing@0.6.0

### 0.5.0

#### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0
  - @rulvar/testing@0.5.0

### 0.4.0

#### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0
  - @rulvar/testing@0.4.0

### 0.3.0

#### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0
  - @rulvar/testing@0.3.0

### 0.2.0

#### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0
  - @rulvar/testing@0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

#### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0
  - @rulvar/testing@0.1.0

## @rulvar/openai

### 1.44.0

#### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0

### 1.43.0

#### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

### 1.42.0

#### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

### 1.41.0

#### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

### 1.40.0

#### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

### 1.39.0

#### Patch Changes

- @rulvar/core@1.39.0

### 1.38.0

#### Patch Changes

- @rulvar/core@1.38.0

### 1.37.0

#### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

### 1.36.0

#### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

### 1.35.0

#### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

### 1.34.0

#### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

### 1.33.0

#### Patch Changes

- @rulvar/core@1.33.0

### 1.32.0

#### Patch Changes

- @rulvar/core@1.32.0

### 1.31.0

#### Patch Changes

- df6b8f8: `Retry-After` accepts HTTP optional whitespace padding only. ECMAScript `trim()` removed far more than the OWS production (space and horizontal tab), so values padded with newline, carriage return, vertical tab, form feed, or NBSP were honored as delays despite the documented exact delta seconds grammar; a real HTTP transport rejects most of those octets, but an injected SDK client or a mock does not. Both first party adapters now match `/^[\t ]*([0-9]+)[\t ]*$/` and fall back to the computed policy backoff for every other form.
  - @rulvar/core@1.31.0

### 1.30.0

#### Patch Changes

- 87ce985: Parse `Retry-After` under the exact RFC delta seconds grammar (v1.29.0 review P3). Published 1.29.0 used `Number(header)`, which accepted far more than the documented delta seconds form: an empty or whitespace header became a 0 ms delay (an instant retry instead of the policy backoff), and hex (`0x10`), exponent (`1e3`), decimal (`1.5`), and signed (`+3`) forms were honored as delays. The value must now be a nonempty run of decimal digits after optional whitespace; every other form (the HTTP date included) omits `retryAfterMs` so the engine's computed backoff applies, and a huge digit run still clamps to the Node timer maximum.
- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

### 1.29.0

#### Minor Changes

- 621d566: Make the retry and failover backoff interruptible and validate every provider supplied retry delay (v1.28.0 review P1 and P2).

  The retry engine now races its backoff wait against the host cancel signal (which the run deadline also drives) and the budget ceiling signal: an abort wakes the wait immediately, settles through the canonical aborted outcome (`cancelled` or `exhausted`, with every already recorded usage kept), and forbids every further dispatch, including the one behind a keyed limiter queue, so an adapter that ignores its signal can no longer be re entered after an abort. Previously a provider supplied `retryAfterMs` armed an uninterruptible sleep: a cancel, a crossed deadline, and a crossed budget ceiling all waited out the full backoff and the adapter was dispatched again. The injected `retry.sleep(ms)` test hook keeps its signature; a hook that loses the race is abandoned without an unhandled rejection, and the native timer path clears its timer so an abandoned long backoff never pins the event loop.

  `retryDelayMs` is now the defensive boundary the docs promise: only a finite nonnegative provider `retryAfterMs` replaces the computed delay, anything else (NaN, Infinity, a negative) is ignored as adapter noise, and every returned delay is a finite nonnegative integer clamped to the Node timer maximum, so a malformed or huge value can never arm an instant or overflowing timer. Both first party adapters stop emitting unvalidated `Retry-After` parses: an unparsable header (the HTTP date form included) omits `retryAfterMs` entirely instead of producing NaN (which also broke the `WireError.data` Json invariant by serializing to null), and a huge but finite value is clamped. The `mapAnthropicStream` TSDoc now states precisely how a truncated stream is reported (the `finished` flag on the return value, with the adapter synthesizing the terminal error).

  Four frozen fixture cassettes are refrozen for this release (the hashVersion-bump refreeze ceremony applies; hashVersion itself is unchanged and existing journals replay identically): in three cap freeze scenarios the main orchestrator entry now honestly settles cancelled at the cap instead of paying one more ordinary turn whose result the forced finish machinery discarded anyway, and one scenario loses a post abort wait suspension that can no longer be dispatched. Entry identities, keys, and every other row are byte identical.

#### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

### 1.28.0

#### Minor Changes

- d98eb0b: Enforce the terminal stream contract end to end (v1.27.0 deep E2E review P1 and P2). The runtime now fails closed when an adapter stream drains without a terminal `finish` or `error` event: the partial turn becomes a retryable transport fault that feeds the ordinary retry and failover machinery instead of settling as `ok` with truncated text, and a requested abort (cancel, budget ceiling, idle severance) remains a clean end with no fabricated provider error. Consumption stops at the first terminal event, so events after `finish` can no longer mutate the value, revise the authoritative bill, or trigger tool execution. The first party adapters enforce the same contract at the wire: the Chat Completions mapper no longer synthesizes `finish: stop` when the stream is cut before a `finish_reason` (usage the provider did report is still forwarded, half assembled tool calls are dropped), the Responses mapper fails closed on EOF without a response terminal event, and the Anthropic adapter surfaces a read cut before `message_stop` as a retryable transport error and no longer converts a caller requested abort during `messages.create()` into a terminal error. `mapResponsesStream` and `mapChatCompletionsStream` accept an optional `signal` so a requested abort keeps ending the stream without a terminal event. The VCR `record` wrapper now commits its cassette row even when the consumer stops reading at the terminal event (the engine always does now); adapter middleware must not rely on being drained past the terminal. The committed `combined-loop-descent` catalog cassette is refrozen because stopping consumption at the terminal shifts the deterministic interleaving of two parallel plan children by one scheduler turn; entry content, keys, and the actual `hashVersion` are unchanged, journals recorded under earlier versions replay unchanged, and this changeset carries the frozen fixture gate's hashVersion-bump ceremony token only to unlock that refreeze.

#### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

### 1.27.0

#### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

### 1.26.0

#### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

### 1.25.0

#### Patch Changes

- @rulvar/core@1.25.0

### 1.24.1

#### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

### 1.24.0

#### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

### 1.23.0

#### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

### 1.22.0

#### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

### 1.21.0

#### Minor Changes

- 7ee42a0: Canonical reasoning effort `max` now reaches the wire unchanged on every GPT-5.6 sibling: Terra and Luna join Sol with `wireMaxEffort: true`, each verified live (a max-effort Responses call returns 200 with the effort echoed, and the API's own 400 validator enumerates `max` among the supported values), closing the silent quality downgrade of the v1.20.0 review P2-3. Pre-5.6 families and unknown models keep the safe, visible downmap to `xhigh`. The adapter also declares `usageSemantics: 'openai-cache-subsets-v2'`, stamped onto usage-bearing journal entries so the cache-accounting semantics ride the journal alongside the numbers, and new exports `undoV1190CacheDoubleCount` and `auditV1190CacheJournal` provide the exact opt-in sidecar inversion for journals recorded by v1.19.0, whose adapter double-counted cache writes (v1.20.0 review P1/P2-2). Numeric hygiene stays with the core boundary validator by design; the normalizer maps wire shape only.

#### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

### 1.20.0

#### Patch Changes

- 9367030: Cache detail tokens are subsets of the full input, never additions. On the OpenAI wire `input_tokens`/`prompt_tokens` is already the complete prompt count; `cached_tokens` and `cache_write_tokens` classify parts of it. The v1.19.0 normalizer added cache writes on top of the full count, double-billing every written token at the base rate plus the 1.25x premium (a 73.6 percent overreport on the review's live cache scenario) and inflating budget debits, which could prematurely exhaust run, agent, and child ceilings. Both the Responses and the Chat Completions paths now pass the provider's full count through untouched and clamp impossible telemetry conservatively (nonnegative, reads keep priority, reads plus writes never exceed the input) instead of rejecting paid evidence. Verified against the live wire: identical prompts report the same `input_tokens` whether the details show a write or a read, and `total_tokens` equals input plus output; a new opt-in live contract test pins exactly that.
- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

### 1.19.0

#### Patch Changes

- 8cc9a9c: Three cost-accounting corrections against the official OpenAI materials. Prompt cache writes are now accounted: GPT-5.6 and later report `input_tokens_details.cache_write_tokens` (Responses) and `prompt_tokens_details.cache_write_tokens` (Chat Completions) separately from the base prompt count, billed at 1.25x the uncached input rate; the adapter previously pinned `cacheWriteTokens` to 0, so the premium never entered cost or the budget guard. Writes now join `inputTokens` (the canonical Usage invariant: the full prompt), mirroring the Anthropic adapter's mapping, with one usage emission per response. `response.failed` now emits the failed response's paid usage before the error termination and classifies `response.error.code` canonically: `rate_limit_exceeded` retries as a rate limit, `server_error` and timeout-class codes retry as transport faults, validation/policy/auth and unknown codes stay non-retryable (fail closed); previously the branch dropped usage entirely and pinned `retryable: false`. The pre-5.6 price rows had gone stale after the provider's price cut and are corrected: `gpt-5.5` 5/30 (cached 0.5), `gpt-5.5-pro` 30/180 (no cached-input rate published; the row omits the field rather than fabricating a discount or a zero), `gpt-5.4` 2.5/15 (cached 0.25), `gpt-5.4-mini` 0.75/4.5 (cached 0.075). `OPENAI_PRICING.pricingVersion` bumps to `openai-2026-07-18-r2` so a resumed run that priced under the stale rows surfaces the drift instead of silently reinterpreting past spend.
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

### 1.18.0

#### Minor Changes

- 943962d: Exact GPT-5.6 Terra and Luna capability and pricing rows, and a safe snapshot grammar. The seed table previously carried only Sol and the `gpt-5.6` alias, and the general prefix matcher let the alias capture the sibling models: `gpt-5.6-luna` and `gpt-5.6-terra` were silently priced as Sol (5x on Luna), which is worse than no price at all. Terra ($2.5/$15 per MTok, cache read $0.25, cache write $3.125) and Luna ($1/$6, cache read $0.1, cache write $1.25) now have their own rows with the family's long-context tier (strictly above 272K input: 2x input, 1.5x output), both exported through `OPENAI_PRICING` under `pricingVersion` `openai-2026-07-18`. Prefix inheritance is restricted to the documented dated-snapshot grammar `<exact model>-YYYY-MM-DD`; any other unknown sibling or suffix now resolves to conservative unpriced caps so its usage lands in `CostReport.unpriced` instead of a fabricated total. Canonical reasoning effort `max` is now sent on the wire unchanged for Sol (`OpenAiModelInfo.wireMaxEffort`); other models keep the documented lossy downmap to `xhigh`, still recorded in `providerMetadata.openai.effortDownmapped`.

#### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

### 1.17.0

#### Patch Changes

- @rulvar/core@1.17.0

### 1.16.2

#### Patch Changes

- @rulvar/core@1.16.2

### 1.16.1

#### Patch Changes

- @rulvar/core@1.16.1

### 1.16.0

#### Patch Changes

- @rulvar/core@1.16.0

### 1.15.0

#### Minor Changes

- 4aee1f3: Production auth surface (v1.14 review P2-2). New `sdkOptions` on `OpenAiAdapterOptions` forwards official SDK construction options verbatim, `maxRetries` excluded from the type (`OpenAiSdkOptions`) and forced to 0: `workloadIdentity` federation included, plus `fetch`, `timeout`, and `defaultHeaders`. The `client` option now accepts the official `OpenAI` instance directly under strict TypeScript, no casts, alongside the structural `OpenAiClientLike` mock; an injected client with SDK autoretries enabled (`maxRetries !== 0`) is rejected with a typed `ConfigError`, as are `client` combined with construction options, duplicated fields, and the `apiKey` plus `sdkOptions.workloadIdentity` conflict, all before any network I/O. A synthetic workload-identity test covers the full path: one token exchange, one Responses API request under the short-lived bearer, canonical finish.

#### Patch Changes

- @rulvar/core@1.15.0

### 1.14.0

#### Patch Changes

- @rulvar/core@1.14.0

### 1.13.0

#### Patch Changes

- @rulvar/core@1.13.0

### 1.12.0

#### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

### 1.11.0

#### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

### 1.10.0

#### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

### 1.9.0

#### Minor Changes

- 7577f8e: Correct the Anthropic fallback pricing to the official table and export versioned price tables from both first-party adapters.

  The `ANTHROPIC_MODELS` seed rows had never been audited against the published price list and overcharged every current Claude model: Fable 5 was seeded at exactly 2x the official rate (20/100 vs 10/50 per MTok, cache rates likewise), Opus 4.8 at 12/60 vs 5/25, Opus 4.7 at 10/50 vs 5/25, and Opus 4.6 at 15/75 vs 5/25. Claude Sonnet 5 now carries its introductory price (2/10, in effect through 2026-08-31); Haiku 4.5 and Sonnet 4.6 were already correct. Cost reports for affected models drop accordingly, and budget ceilings admit roughly twice the work they previously rejected.

  New exports `ANTHROPIC_PRICING` (`anthropic-2026-07-16`) and `OPENAI_PRICING` (`openai-2026-07-16`) publish the seed rows as versioned `PriceTable`s for `createEngine({ pricing })`, so runs journal a concrete pricing version instead of `unpriced` and price revisions become explicit table updates. `createTestEngine` gained a `pricing` passthrough for testing against a versioned table.

#### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

### 1.8.0

#### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

### 1.7.0

#### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

### 1.6.0

#### Minor Changes

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

#### Patch Changes

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

### 1.5.2

#### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

### 1.5.1

#### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

### 1.5.0

#### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

### 1.4.0

#### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

### 1.3.0

#### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

### 1.2.0

#### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

### 1.1.0

#### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

### 1.0.0

#### Patch Changes

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

### 0.9.0

#### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

### 0.8.0

#### Patch Changes

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

### 0.7.0

#### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

### 0.6.0

#### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

### 0.5.0

#### Minor Changes

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

#### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

### 0.4.0

#### Minor Changes

- f668890: M3-T05 worktree isolation and M3-T06 openaiCompatible. GitWorktreeProvider
  implements the IsolationProvider seam: acquire creates a detached
  worktree from HEAD or a given ref (non-git host is a typed ConfigError),
  tools receive cwd inside the tree, collect() snapshots changed files and
  a binary patch, dispose removes the tree with keepOnError retention
  under the shared maxPinnedWorktrees cap (default 4). ctx.agent resolves
  isolation call-over-profile into spawn identity, stores the collected
  patch in TranscriptStore, and surfaces it as a kind 'patch' Artifact on
  AgentResult.artifacts and the terminal journal entry, so replays
  reconstruct artifacts with zero live calls; applying the patch stays
  with the caller. isolation 'readonly' is accepted as a declaration (its
  compiled deny rule ships with risk presets in M5).

  @rulvar/openai gains openaiCompatible({ id, baseURL, apiKey?, caps? })
  for Ollama, vLLM, and gateways: the Chat Completions dialect by
  construction, explicit ids so several endpoints coexist (duplicate id
  stays a ConfigError at createEngine), and the most conservative caps
  when unprobed (prompt-tier structured output, no parallel tools, no
  pricing; supplied caps merge over the floor).

#### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

### 0.3.0

#### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

### 0.2.0

#### Minor Changes

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

#### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

#### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0

## @rulvar/plan

### 1.44.0

#### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0

### 1.43.0

#### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

### 1.42.0

#### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

### 1.41.0

#### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

### 1.40.0

#### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

### 1.39.0

#### Patch Changes

- @rulvar/core@1.39.0

### 1.38.0

#### Patch Changes

- @rulvar/core@1.38.0

### 1.37.0

#### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

### 1.36.0

#### Minor Changes

- 101795b: Make the guards fallback `'fail-run'` a real failure policy (v1.35.0 review P2). After the journaled guard verdict the PlanRunner terminates the orchestration with `FailRunError` (`data.source: 'plan_guards'`, `data.verdictRef`) through the new extension terminate capability: no further model turn is consulted, the run ends with outcome `error`, and a resume re folds the verdict at boot and rolls the same failure forward with zero model calls. `reject-revision` and `finish-with-partial` keep their historical steer to finish behavior.

#### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

### 1.35.0

#### Minor Changes

- d4ac3bf: Validate `RevisionGuards` limits at construction (v1.34.0 review P2-3). The streak and oscillation limits must be positive integers, the stall replan cap a nonnegative integer, and `maxAbandonedNetUsdFraction` a fraction in (0, 1]; anything else, NaN included, is a typed `ConfigError` before any revision is judged. Unvalidated, a NaN limit inverted the machinery: the dropped and oscillation guards tripped immediately while the stall cap never tripped at all.

#### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

### 1.34.0

#### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

### 1.33.0

#### Patch Changes

- @rulvar/core@1.33.0

### 1.32.0

#### Patch Changes

- @rulvar/core@1.32.0

### 1.31.0

#### Patch Changes

- @rulvar/core@1.31.0

### 1.30.0

#### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

### 1.29.0

#### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

### 1.28.0

#### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

### 1.27.0

#### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

### 1.26.0

#### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

### 1.25.0

#### Patch Changes

- @rulvar/core@1.25.0

### 1.24.1

#### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

### 1.24.0

#### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

### 1.23.0

#### Minor Changes

- 1f9c272: PlanRunner spawn telemetry, the missing evals export, and the conformance kit's new meta field (v1.22.0 review P2-5, P2-6, P1-2).

  - `@rulvar/plan`: PlanRunner journals every admission INSIDE a carrying entry (decomposition rows in escalation decisions, ladder-verdict respawns, reuse and graft links, revision admissions) and emitted no `spawn:admitted`/`spawn:rejected` at all; a live PlanRunner run with admitted roots showed an event count of zero. Every embedded admission row now announces through one formatter, identically on the live path and on replay absorb, with `replayed: true` on recovered rows, `entryRef` on the journaled carrying entry, and `agentType` resolved from the landed specs.
  - `@rulvar/evals`: `agentTypeRuleHolds` joins the package root next to `rungRuleHolds`, exactly as the v1.21.0 changelog had already announced; a public-API test now imports the checkpoint quartet from the root. The evals guide gains a full measured-value checkpoint section (ladder/pool/cell/arm vocabulary, both criteria, the vacuous-pass guard, cost discipline, a runnable example).
  - `@rulvar/store-conformance`: the meta round-trip case now also pins the new optional `RunMeta.segments` field, which the engine bumps durably at every resume to keep event `seq`/`spanId` unique per run.

#### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

### 1.22.0

#### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

### 1.21.0

#### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

### 1.20.0

#### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

### 1.19.0

#### Minor Changes

- 8cc9a9c: `orchestrate(engine, goal, opts?, runOptions?)` and `orchestratePlanned(engine, goal, opts?, runOptions?)` accept the created run's `RunOptions` as an optional fourth argument, threaded verbatim to `engine.run`. `runOptions.budgetUsd` is the ROOT hard ceiling over the whole tree (the orchestrator and every child), immutable after start and frozen into `RunMeta`, while `opts.budget` only shapes the orchestrator's own sub-account inside that ceiling; the two layers were previously conflatable, and the canonical shortcuts could not set a root ceiling (or signal, runId, limits, deadline) at all without dropping to `engine.run(makeOrchestratorWorkflow(goal, opts), undefined, runOptions)`. Purely additive; existing calls are unchanged, and a call without `runOptions` still starts an UNCAPPED run, which the docs now state explicitly.

#### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

### 1.18.0

#### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

### 1.17.0

#### Patch Changes

- @rulvar/core@1.17.0

### 1.16.2

#### Patch Changes

- @rulvar/core@1.16.2

### 1.16.1

#### Patch Changes

- @rulvar/core@1.16.1

### 1.16.0

#### Patch Changes

- @rulvar/core@1.16.0

### 1.15.0

#### Patch Changes

- @rulvar/core@1.15.0

### 1.14.0

#### Patch Changes

- @rulvar/core@1.14.0

### 1.13.0

#### Patch Changes

- @rulvar/core@1.13.0

### 1.12.0

#### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

### 1.11.0

#### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

### 1.10.0

#### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

### 1.9.0

#### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

### 1.8.0

#### Minor Changes

- 7884ec5: PlanRunner plan admission is now atomic with child dispatch admission (the v1.7.0 follow-up review's P1). Previously a `plan_revise` op could be journaled as `admit` (consuming its spawn unit) and only then have `scheduleReady`'s dispatch rejected by the engine budget, stranding the node ready forever, losing the `plan:revised` event, and burning the orchestrator budget with no worker output.

  - An `add_task` op whose resolved profile `estCost` cannot fit the effective child ceiling (rung-resolved `maxCostUsd`, else `budgetUsd`) is bounced at rebase time with the new typed reason `reserve_exceeds_budget` naming the child account, requested and resolved reserve, ceiling, and minimum correction. No plan state changes and no spawn unit is consumed; the `plan_revise` tool result carries the reason verbatim.
  - The read-only admission branch now projects the SAME reserve the dispatch layer will commit (estimate clamped by the explicit child budget only), plus the pending reserves of earlier ops in the same revision, so every embedded admit of one batch is dispatchable under the snapshot it was decided on. The dynamic `spawn_agent` path passes the profile estimate into admission for the same reason.
  - Layer 1 (ctx.agent) clamps its committed reserve to the tightest `child-allowance` account headroom on the chain (a plan node's own sub-account, a `ctx.workflow` child ceiling): an allowance already bounds the child's lifetime spend, so an estimate above it clamps instead of denying, which is what makes "admit implies dispatchable" hold by construction. The run root and orchestrator cap are never clamped against; their headroom is shared money that projected admission keeps protecting.
  - `plan:revised` and `termination:debit` now emit strictly after the durable revision append and before the scheduling effects, so a scheduling fault cannot erase an applied revision from the event stream.
  - The residual class (facts that genuinely changed between admit and dispatch, e.g. the engine lifetime spawn cap) lands the node terminally `failed` through a journaled `plan.decision` with the new origin/cause `dispatch-rejected`; other ready nodes still dispatch and the run proceeds.

  Acceptance tests cover the review's live shape (profile `estCost` 0.015 against `budgetUsd` 0.01), the positive control, resume idempotence, the containment path, and an admit-implies-dispatchable property grid over estimates, budgets, ceilings, flat reserves, and prior commitments.

- 52db30d: `termination.init` now freezes the ACTUAL orchestrator budget dollars instead of zeros, closing the journal-contract gap the v1.7.0 follow-up review found: the budgets guide documents `orchestratorCapUsd` and `finalizeReserveUsd` as frozen in the same limits vector as the counters, but PlanRunner journals stored `0` for both and only the later `orchestrator_budget_reserve` decision carried the real values.

  - The engine resolves the effective cap and finalize reserve strictly before extension boot and exposes them on `OrchestratorExtensionIO` (`orchestratorCapUsd`, `finalizeReserveUsd`); PlanRunner writes them into `termination.init`.
  - On resume the cap dollars are now recovered from the frozen `orchestrator_budget_reserve` decision instead of being re-derived from live options (DEF-2 config-drift-resume: the journal wins). A diverging live `capUsd`/`capFraction`/`finalizeReserveUsd` emits `termination:config-drift` and is never honored.
  - Journals recorded before this release (zeros in `termination.init`) replay unchanged: the fold reads the init entry by kind, and the reserve decision remains their authority.
  - The reserve-decision presence guard is now scoped to the orchestrate call, so nested capped orchestrations each journal their own freeze.

  The frozen cassette catalog is re-recorded (the init limits vector and its content key change); hashVersion stays 2, and the fixture lock refresh carries the required hashVersion-bump token.

#### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

### 1.7.0

#### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

### 1.6.0

#### Patch Changes

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

### 1.5.2

#### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

### 1.5.1

#### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

### 1.5.0

#### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

### 1.4.0

#### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

### 1.3.0

#### Minor Changes

- 7d1a287: ModelKnowledge phase 3, first slice (M12-T02, unlocked by the passed measured-value checkpoint): the kb_propose orchestrator tool and the quarantined modelObservations write path. PlanRunner registers kb_propose on explicit opt-in (PlanRunnerOptions.kbPropose, like any opt-in tool); its payload is tier-relative (the orchestrator never names a model) and the engine resolves the tier against the referenced lineage's declared ladder into the concrete KbProposal subject, validates that the tier has a journaled attempt and that evidence refs resolve to this run's decision entries, and journals the proposal as the observation_add ledger.op through the single-writer path. Quarantine is absolute: the ack is entryRef only, ledger_read withholds observation content behind a count (byte-stable for observation-free renders), worker prompts never see it, and nothing can commit during a run (the runtime handle has no write path by API shape); proposals reach the human gate only through the post-run LedgerExport. Core exports KbProposal, KbProposalTrigger and the typed model-free proposalStatement template. The kb-propose-quarantine cassette joins the frozen catalog (61 IDs).

#### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

### 1.2.0

#### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

### 1.1.0

#### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

### 1.0.0

#### Minor Changes

- 0e0b569: M10 entry: the render budgets of docs/06 Appendix A are committed (the TBD-before-M10 rule) and wired as engine defaults; OQ-04 (the renderBudget measure) closes on the CHARACTER measure.

  - WakeDigest: 400 chars per outputSummary row, one exported constant (`WAKE_SUMMARY_RENDER_BUDGET_CHARS`) now serving both the distillation cap (adopted unchanged, the value frozen into every cassette since M6) and the digest render default of `renderBudgetChars`, which stays overridable per orchestration.
  - ledger_read render: 65536 chars over the serialized view via the new pure `boundLedgerRender` (exported with `LEDGER_RENDER_BUDGET_CHARS`): over budget, rows drop deterministically oldest-first (auto-derived joins before authored sections, the mission brief slices last) and every drop renders as a FLAGGED discrepancy line. The section caps stay the primary bound, so under default termination limits the belt never engages; all frozen fixtures are byte-identical.
  - KB card: 4096 chars, committed in docs and consumed by the M10-T03 card renderer.

- 4454175: M10-T03: the ModelKnowledge read path (docs/05, sections "Read path" and "Security"). kb_pinned and kb_repinned land, the card renders, and the whole feature is store-gated: an engine without `stores.modelKnowledge` writes no kb entries at all, so every existing journal and cassette stays byte-stable (zero added awaits on the off path).

  - `createEngine` accepts `stores.modelKnowledge`; the runtime holds ONLY the `current()` handle (commit is physically absent inside runs).
  - One read at run admission for orchestrate-role runs: the engine filters claims (active, unexpired, reachable through the run's declared ladders after the role-floor filter) and journals `kb_pinned { version, hash, cardText }` with the card bytes EMBEDDED, strictly before the first orchestrator turn. Resume and replay read the entry bytes and never touch the live store.
  - A fresh `kb_repinned` lands on every wait_for_events wake under the same filtering rules against a FRESH store read, so expired, stale, and archived claims never steer spawns after pauses; a mid-run store commit affects only subsequent pins.
  - `modelKnowledgeCard`: deterministic, two-layer, tier-relative, 4096-char budget (oldest notes withhold behind an explicit marker). The verified layer compiles EXCLUSIVELY from eval-measured claims (empty in phase 1) with the one-rung clamp; editorial notes render dated and explicitly marked, never compiled into a tier; the orchestrator never sees model names. The card docks into the spawn tool description beside the profile card.
  - OQ-11 closes: editorial notes render for every taskClass with no self-description suppression (the nameless tier-relative render already blunts the feared bias).
  - Two catalog cassettes (docs/09, new section 6.11): kb-pin-replay and kb-repin-expiry, recorded offline over a deterministic stub store with time-stable dates; the cassette-catalog CI job runs them.

- 6599ca8: M10-T05: the taskClass binding interim rule becomes the phase-1 resolution (docs/05, section "Phases and placement"; docs/14 OQ-12 CLOSED). The classification source is author declaration: the optional `taskClass` on AgentProfile, TaskSpec, and spawn_agent params; absence means unclassified and stores no literal string anywhere. Card recommendations never apply to unclassified spawns (in phase 1 no recommendation application exists at all; the M11 compiler inherits the rule as normative).

  - The plan dispatch now forwards the declared TaskSpec.taskClass onto the ExtensionDispatchSpec, completing the substrate: a declared class journals inside the spawn-admission decision (spawn_agent path) and the plan.revision spec of record (PlanRunner path), so M11 matrix sweeps and the recommendation compiler slice attempts by class from journals alone.
  - Byte-neutral: journals without declared classes are unchanged; floors stay profile-driven per docs/04.

- 0fbe7ea: M9-T04 (part 1): the DEF-2 and DEF-3 catalog rows deferred at M7 (docs/09 sections 6.2 and 6.3; docs/10 M9 row "Complete catalog green in one CI run"), plus the producers and liveness fixes the rows exposed.

  - Nine new frozen cassettes with public runners and byte-for-byte replay tests: combined-loop-descent, config-drift-resume, class-storm-single-turn, oscillation-bounded, race-timeout-vs-live (DEF-2); respawn-preserves-counter, reworded-lessons-collide, stall-streak-classes-and-pinning, legacy-journal-resume (DEF-3). The class and race rows additionally round-trip their frozen bytes through BOTH reference stores (JsonlFileStore and SqliteStore) with identical loads, per the store-independence rule.
  - `@rulvar/plan`: the class-level escalation decision producer lands (docs/07 6.5): two or more same-kind reports resolved by ONE revision merge into ONE escalation-decision entry with per-lineage `debits` rows and resolvedBy 'class'; a denied per-lineage debit degrades the group to single-target decisions so denial semantics stay per report. The folds already consumed this form; single-target behavior and all existing cassette bytes are unchanged.
  - `@rulvar/plan`: `termination:config-drift` now actually fires on resume when a live termination knob diverges from the journaled `termination.init` (the journal wins, the divergence is reported per field; docs/07 11.2). Events are never journaled, so frozen cassettes are unaffected.
  - `@rulvar/plan`: a `retry` escalation decision re-opens the node AND clears its stale dispatch handle; previously the re-opened node sat ready forever while the scheduler skipped it (the re-dispatch liveness gap behind Flavor B defaultDecision retry).
  - `@rulvar/plan`: `lesson_add` keys once (docs/07 9.2): a repeated add with the same content key acks the recorded lesson instead of appending a duplicate; re-executed-turn recovery is unchanged.
  - `@rulvar/core`: an extension dispatch whose agent dies BEFORE its root entry lands now surfaces the underlying failure loudly to the dispatching caller instead of hanging the dispatch await forever (the pre-root cousin of the stale-writer liveness rule). Healthy paths and replays are byte- and timing-identical.
  - Known residual, unchanged: repeated Flavor B suspensions on ONE re-opened node dedup onto the first suspension's decision key; the recorded cassettes route around it and the at-cap immediate-resolution flavor rows stay with M9-T04's later parts.

- ebe0abc: M9-T04 (part 2): the six DEF-5 catalog cassettes (docs/09 section 6.5; docs/03 section 9), plus the reuse-producer completions the rows forced.

  - Six new frozen cassettes with public runners and byte-for-byte replay tests: oscillation-full-reuse (escalated-terminal donor, shared full link, by-ref root, reclaimedUsdAtLink carries the donor spend), graft-partial-subtree (a three-rung limit ladder severed mid-top-rung grafts exclusively; the completed rung attempts forward-match through the scope alias and only the interrupted rung reruns live, exactly once), crash-between-link-and-root (cut strictly between the durable node.link and the by-ref root; the resume rolls forward with zero repayment), oscillation-guard-trip (the third re-add at maxOscillationsPerKey 2 rejects osc_guard with the embedded verdict and the run closes non-HITL), worktree-disposed-degrade (an unpinned worktree graft donor degrades to a fresh admit with DedupNote graft_unsafe; reuse_full stays allowed for a worktree donor with a terminal root), claim-exclusivity-and-chain (two identical adds in ONE revision: the first grafts exclusively, the second degrades donor_active; the severed grafted node becomes the chain head and the third add drains the chain transitively; oscillationCount reaches 2).
  - `@rulvar/core` (docs/03 9.3/9.6 producer completions, folds and bytes of existing journals unchanged): evaluateReuse now skips exclusively-claimed donors (first-wins) and degrades to a fresh admit with the documented `donor_active` reason when every candidate is captured; a severed grafted node inherits its captured link's chain (ancestry plus chain-tail graft eligibility), so the next add links to the chain head and drains transitively; agent dispatch roots record their resolved isolation (`value.isolation`, only when not 'none') so the DedupIndex worktree rules can read it from the journal.
  - `@rulvar/plan`: exclusive captures are first-wins WITHIN one revision too: the second identical add of the same revision degrades to `donor_active` instead of double-claiming the donor.
  - All fifteen M9 cassettes re-record byte-identically under the double-run agreement; the nine part-1 fixtures are untouched by the producer changes. fixtures.sha256 covers 50 frozen files.

- a3079d0: M9-T04 (part 3): the six DEF-8 catalog cassettes plus the DEF-7 reserve-survives-run-exhaustion row (docs/09 sections 6.7 and 6.8), with the roll-forward and reserve producers the rows exposed.

  - Seven new frozen cassettes with public runners and byte-for-byte replay tests: revise-racing-defaultDecision (the mandatory stale-wake trio dropping dep_already_resolved with blockingRef, node_escalated, node_already_done in ONE revision), crash-after-append-before-effects (the pre-effects kill point; both children spawn live exactly once on resume and the request-only cancel lands on the redispatched branch), amend-vs-running-then-cancel-add, intra-revision-self-conflict (sequential intra-revision semantics), bad-base-streak-terminates (three fabricated-base all-dropped entries then the non-HITL guards fallback), park-races-child-completion (parkRequested extinguished by the child-result transition, no park retention), and reserve-survives-run-exhaustion (adds that would invade the committed finalize reserve drop admission_denied inside the revision outcomes; the forced finish executes FROM the reserve and closes the run ok).
  - `@rulvar/plan`: the idempotent plan_revise recovery path now also re-lands request-only cancels and parks by aborting the redispatched mid-flight branch; previously the crash-after-append-before-effects roll-forward left the cancelled branch running forever.
  - `@rulvar/plan`: an accepted escalation resolution records the node's done reference (doneRefs), so a later waive_dep against the resolved dependency drops dep_already_resolved with the blockingRef pointing at the resolving reference, exactly like a child-result transition.
  - `@rulvar/core`: the forced finish now RELEASES the finalize reserve as it begins (releaseFinalizeReserve): the reserve stops subtracting from the admission remainder at the moment it is being spent, or the finalize agent could never draw the money reserved for it under a tight run ceiling. Admissions stay frozen past the cap, so nothing else can take it. Cap behavior under unlimited ceilings (all existing cassettes) is byte-identical.
  - All 22 M9 cassettes re-record byte-identically under the double-run agreement; fixtures.sha256 covers 57 frozen files.

#### Patch Changes

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

### 0.9.0

#### Minor Changes

- f920013: M8-T03: the multi-process seam soak and the queue-failover-during-forced-finish cassette (the DEF-7 final cassette; docs/09 sections 6.9 and 6.10; docs/10 section 3.9 exit criteria).

  - `@rulvar/plan`: the public `runQueueFailoverDuringForcedFinish` cassette runner: worker A loses its lease strictly between the cap decision and the final wake; worker B reclaims with a bumped fencing epoch and rolls the forced finish forward. The stale writer's appends are rejected and invisible, exactly one cap decision exists, finalization is paid once. The LeasableStore is injected (`QueueFailoverDeps.makeStore`) so the package stays core-only; the replay test and the record script supply the reference SqliteStore.
  - `@rulvar/cli`: the multi-process-fencing-soak harness: two workers over one SqliteStore file with kill/failover across the suspension, plan-revision, and forced-finish boundaries; every round asserts zero split-brain and zero double pay. Worker hardening: a failed renew now frees the concurrency slot immediately (a stale run whose landings all reject may never settle; fencing, not the stale process's cooperation, protects the journal).
  - Repo: `cassettes/queue-failover-during-forced-finish.json` recorded and frozen (double-run agreement; `scripts/record-m8-cassettes.mjs`); the queue-mode limitation stays documented (no distributed cross-process rate limiter, EXC-14/OQ-17).

#### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

### 0.8.0

#### Minor Changes

- 85d55cf: The v0.8.0 BREAKING release notes (M7 adaptive orchestration full; the flagged BREAKING minor of the pre-1.0 convention, docs/12 registry).

  BREAKING: the unified `AdmitVerdict` union is extended with the reuse verdicts (`reuse_full`, `admit_graft`) and the new reject codes (`termination_exhausted`, `ladder_exceeds_frozen`, `lineage_exhausted`, `lineage_busy`, `osc_guard`) (DEF-5). How it fails: exhaustive switches over the verdict kind or reject code in custom shells and admission SPI extensions stop compiling. Migration: add branches for the new arms; reject-code switches should route unknown codes to their generic-denial path.

  BREAKING: reuse-by-reference is the DEFAULT (DEF-5). A byte-identical `add_task` after a cancel or abandon no longer re-executes the subtree: the result returns by reference (`reuse_full`) or continues from the paid prefix (`admit_graft`). How it fails: changed semantics; runs that relied on re-execution against a changed world observe referenced results instead. This is the only intentional change of visible semantics in the pre-1.0 line. Migration: set `reuse.enabled: false` on the admission config, or `fresh: true` on the specific `add_task`.

  BREAKING: the config key `maxEscalationsPerNode` is renamed to `maxEscalationsPerLogicalTask` (XF-10): escalations count per logical task across respawns via the lineage chain. How it fails: a typed `ConfigError` naming the new key rejects the old one. Migration: rename the key; the default stays 2.

  BREAKING: the plan-size-scaled revision budget option is removed without deprecation (DEF-2). `maxRevisionsPerRun` is an absolute, non-replenishable counter (default 32) debited by exactly 1 per journaled `plan_revise`; nothing increments it. How it fails: the removed option is rejected at config validation. Migration: size `maxRevisionsPerRun` directly.

  BREAKING: `plan_revise` result and error schemas widen (rebase outcomes, embedded admissions, `revisionUnitsRemaining`) and `WakeDigest` gains the MANDATORY `termination` field beside `planHash`, `budget`, and `reuse` (DEF-2/DEF-8). How it fails: schemaHash and toolsetHash of orchestrator scopes change, so VCR cassettes recorded over orchestrator turns invalidate. Migration: re-record affected cassettes; consumers of the digest type add the new mandatory blocks (all-zero outside PlanRunner).

  BREAKING: B0, the run budget ceiling, is immutable after start (DEF-2): no API, including HITL decisions, can top it up. How it fails: code that mutated the run budget mid-run or expected an HITL top-up hits a typed runtime error; overshoot stays bounded by one turn per in-flight agent. Migration: size the ceiling at start; use the orchestrator cap and the finalize reserve (DEF-7) for graceful degradation instead of top-ups.

  BREAKING: PlanRunner requires a resolvable orchestrator cap (DEF-7). `orchestratePlanned` with no run USD ceiling and no explicit `budget.capUsd`, or with `effectiveCap < finalizeReserve`, refuses to start with a typed `OrchestratorCapConfigError` before any LLM call. Migration: pass `budget: { capUsd }` (or run under a USD ceiling and rely on `capFraction`, default 0.2; up to 1.0 opts out explicitly with a telemetry warning).

- 712a28e: M7-T01: the plan scope substrate. `TaskPlan` as engine-owned typed data (docs/07 3.1): `PlanNode` with the exact canonical field list, the closed `PlanNodeStatus` machine with immutable terminal statuses (`done` is immutable by construction) enforced by `assertPlanTransition` raising the typed `PlanInvariantError`; pure derivations `depsSatisfied`, `recomputePlanReadiness` (dependency satisfaction is derived in the fold, never a record), and `wouldCreateDepCycle` for the rewire_deps atomicity rule. `planHash` (docs/07 3.4): sha256 over the RFC 8785 canonical projection of PlanState through the frozen hashVersion 2 deriver, nodes sorted by NodeId, deps sorted in the hash, plus the guard fold counters revisionCount and droppedRevisionStreak; `assertPlanHead` raises `PlanInvariantError` on a fold-head mismatch; golden hashes are frozen in tests. `PlanWriteLock` (docs/07 3.2, XF-07): the in-process FIFO mutex serializing ONLY plan-scope appends, never a substitute for the ResolutionArbiter. The single sequential scope constant `PLAN_SCOPE` is `'plan'`. The temporary `M0_SCAFFOLD` marker is removed now that the package's first real API has landed.
- c8d88e7: M7-T04: plan.revision, plan.decision, and the committed rebase algorithm (DEF-8). `task-spec.ts`: the typed `TaskSpec`/`TaskSpecPatch` of docs/07 4.1 with `promptSpecHashOf` and patch application. `plan-entries.ts`: the two plan-mutating entry payloads (`PlanRevisionValue` with base/requestedOps/outcomes/assignedNodeIds/admissions/planHash chain/rationale plus the DEF-2 extensions; `PlanDecisionValue` with the closed `EnginePlanOp` set), content keys per docs/07 3.3 (rationale never keys), and THE single applier `applyPlanEntry`: replay consumes recorded outcomes (the APPLIED diff), never re-runs rebase, verifies the planHash chain under each entry's own hashVersion and raises the typed `ReplayPlanHashMismatch` at the exact entry; bad_base entries leave the hashed state byte-identical while lengthening the guard-side streak (`effectiveDroppedStreak`); terminal set_node_status transitions extinguish pending park/cancel flags and record doneRefs for waive blockingRef. `rebase.ts`: the committed algorithm (base validation against the recorded WakeDigest pair, conflicts evaluated ONLY against the fold head, sequential intra-revision application, per-op applied | transformed | dropped with the complete closed conflict table and reason codes, engine-computed cancel cascades excluding done, embedded add/unpark admissions, lineage-at-head checks, the DEF-5 dedup transform hook, and the DEF-7 plan_frozen row). Every row of the conflict table is exercised by the table-driven test matrix; the revise-racing-defaultDecision cassette shape asserts the exact dropped trio with blockingRef.
- a41c20f: M7-T05: PlanRunner scheduling and toolset. Core gains the PUBLIC orchestrator extension seam (docs/02 section 4 seam-sufficiency: orchestration packages build exclusively from the public API): `OrchestrateOptions.extension` hosts an `OrchestratorExtension` with boot strictly before the orchestrator's first agent entry, extension tools appended to the mode (c) toolset, an activity hook running after every child settlement strictly before wake evaluation, quiescence participation (nothing running AND nothing ready), digest extras, wake observation, prompt lines, and an `OrchestratorExtensionIO` exposing total-order appends into extension-owned scopes, the journal snapshot, the single admission point, explicit-scope child dispatch through the ordinary ctx.agent path (plan/NodeId sub-accounts open beside the orchestrator account), settled lookups, cancel, ULID minting, and telemetry. `outputSchemaRef`/`toolsetRef` now RESOLVE against the new `defaults.schemas` and `defaults.toolsets` engine registries (unknown names stay typed tool errors); `TerminationAccount.bindDeniedWriter` binds I/O onto fold-rebuilt accounts. @rulvar/plan ships `planRunner(options)` and `orchestratePlanned(engine, goal, opts)`: boot writes `termination.init` (frozen limits with kMax and the profile-registry snapshot hash) strictly before the first scheduling entry and binds the account into admission; plan_view renders the pinned pure fold (plan state, per-node LineageStats, the TerminationAccount snapshot) at the last delivered WakeDigest, with digestSeq 0 seeded as the empty-plan bootstrap snapshot; plan_revise (normative docs/07 4.7 schema) debits one revisionUnit per journaled revision (underflow writes termination.denied first), evaluates the committed rebase at the fold head, appends ONE plan.revision strictly before effects, schedules newly-ready nodes under plan/NodeId scopes, lands cancel requests, re-issues idempotently on re-executed turns (roll-forward), and emits plan:revised plus termination:debit; the engine (never the model) schedules ready nodes and journals ready-to-running and terminal transitions as plan.decision entries whose terminal transitions extinguish pending flags; quiescence completes (nothing running and nothing ready). The end-to-end revise-mid-run shape and a full crash-resume with zero live calls and no duplicate entries are covered by integration tests against the public engine API.
- 51b062a: M7-T06: RevisionGuards, the oscillation detector, and hysteresis (docs/07 3.8). New `guards.ts`: the non-HITL terminating guard state machine whose every verdict is a journaled decision entry (decisionType 'guard-verdict') written strictly BEFORE its effects, with replay rebuilding state from journaled verdicts. The droppedRevisionStreak detector consumes `effectiveDroppedStreak` (the hashed counter plus trailing bad_base entries) and fires the configured fallback (reject-revision | finish-with-partial | fail-run; default finish-with-partial, droppedRevisionLimit default 3) exactly once: further plan_revise calls are rejected with a typed tool error instructing a finish with the partial result, and the fourth revision after a three-bad-base streak journals nothing and debits nothing. The oscillation detector keys on approachSigCoarse ACROSS LogicalTaskId boundaries: a re-add after a severing cancel counts one oscillation, the per-key limit (2, the Appendix A osc_guard default) freezes the signature with a journaled verdict plus a guard:oscillation event, and frozen re-adds reject at admission with the embedded osc_guard verdict (dropped admission_denied in the revision entry); guard counters are fed from the plan fold itself, identically live and on replay, so freeze thresholds never shift across a resume (fired-but-unjournaled verdicts roll forward at boot, deduplicated by content key). Stall detection emits stall:detected per (lineage, streak) with the hard per-run stall replan cap journaling its own verdict; hysteresis stays structural (park/cancel against running nodes land only as boundary flags, so nearly-done children are never killed mid-turn). plan_view now renders the guards block (engaged fallback, frozen signatures, stall replans used).
- f4e70be: M7-T07: reuse-by-reference (DEF-5). Core: new `journal/reuse.ts` with the rich `DonorRef` (replacing the M6 seq placeholder inside the closed AdmitVerdict union), `GraftBoot`, `DedupNote`, `ReuseConfig`, `NodeLinkValue` and its content identity (`nodeLinkKey` over {kind, spawnKey, donorScope, targetNodeId}), the `DedupIndex` pure fold (severed roots become donor candidates when their pre-abandon effective status is not error, memoized failures excluded, exclusive claims resolve first-wins, plan-node scopes sweep their own branch payments, unpinned worktree donors degrade), `evaluateReuse` with the four-outcome verdict table (reuse_full | admit_graft | fresh-with-note | reject osc_guard at the link count), and the abandoned-spend ledger fold (abandonedUsd/reclaimedUsd/netLostUsd, per-key oscillation counts). The kernel matcher gains scope-prefix aliasing (docs/03 9.5): `registerAlias` merges donor-scope candidates into the target scope in journal order at every nested level, and the alias disposition bypasses the abandon overlay so donor entries regain their pre-abandon status ONLY through the alias (the standalone old scope stays skipped); a dangling donor root through the alias IS the graft frontier (rerun-dangling continues from the donor checkpoint). `AbandonAttempt` carries logicalTaskId (XF-04); the extension IO gains `abandonBranch`, `registerAlias`, and `priceUsd`. Plan: PlanRunner wires the DedupIndex at the fold head under the PlanWriteLock into the rebase dedup hook (transforms embed the verdict, the donor descriptor, and the placement into the revision entry), applies the per-SpawnKey osc_guard rejection, attaches DedupNotes to fresh admits, compiles applied cancel_task (and cancel-landed) into severing abandon entries with lineage attribution, lands node.link entries and by-ref roots in the mandatory write order with idempotent roll-forward, registers aliases (rebuilt by fold at boot), completes full-linked nodes by reference through an engine decision instead of a dispatch, debits a spawnUnit per reuse link, and renders the abandoned-spend view in plan_view (pinned) and the WakeDigest extras; `PlanRunnerOptions.reuse` carries the docs/03 9.9 config.
- 75d1646: M7-T08: park and unpark. Core: the internal boot-checkpoint channel lets a FRESH dispatch boot from a retained transcript checkpoint (`ExtensionDispatchSpec.bootCheckpointRef`; dangling redispatch checkpoints take precedence), serving park/unpark continuation and the DEF-5 graft boot. Plan: new `park.ts` with the `PinLedger` fold (live pins counted from abandon entries carrying retainWorktree, park pinning and DEF-5 retention SHARE `maxPinnedWorktrees`, default 4), `parkDispositionOf` (checkpoints always retained; worktrees pinned only under capacity, overflow keeps the checkpoint but drops the tree), and `unparkPlacementOf` (continuation from the retained checkpoint; restart when no checkpoint exists or a worktree-isolated node lost its tree: silent resume against a fresh tree is impossible). PlanRunner lands parks at the turn boundary: a park-requested running child is aborted, the `park-landed` plan.decision transitions running to parked carrying the checkpoint anchor (set_node_status gains the optional checkpointRef field, applied by the fold), the branch is severed with retainCheckpoint plus retainWorktree per the pin disposition, the dispatch slot frees for the unpark, and node:parked emits. unpark_task applies with the embedded admission: a previously dispatched branch is a lineage rebirth (relation 'unpark-restart' continuing the node's LTID), while a never-started parked node resumes scheduling without consuming an attempt; the unparked dispatch boots from `checkpointRefFor(runId, anchor)` on the continuation path and restarts otherwise. The park-unpark integration test drives the full shape deterministically (one paid tool turn, park inside the second turn, unpark continuation whose booted history carries the paid turn) plus the pin-cap overflow and placement rows as units.
- 5ed23d5: M7-T09: RunLedger (docs/07, section 9). New `ledger.ts`: the CLOSED authored op vocabulary (`brief_set` once per run, `fact_add`/`fact_supersede`, `lesson_add` keyed by (logicalTaskId, approachSig), `observation_add`), `foldLedger` as a pure fold of `ledger.op` entries joined to the journal task table (auto-derived revisionHistory, taskDigests, worldDelta; journal-vs-ledger contradictions render as flagged discrepancies, never as truth), single-writer discipline (foreign-scope ops ignored and flagged), Appendix A section caps (64 facts, 32 lessons, 16 observations) via `ledgerCapViolation`, compaction sufficiency via `ledgerSufficiency`, and the draft-versioned `exportLedger` (`ledgerExportVersion: 'draft-1'`). PlanRunner gains `ledger_append` and `ledger_read`: appends are journaled effect entries of kind `ledger.op` in the orchestrator scope with content-derived keys, idempotent on re-execution (a journaled op acks with the recorded ref and skips validation, so re-executed turns never spuriously reject); a `lesson_add` whose key matches no journaled attempt of that logical task rejects as a typed tool error; `ledger_read` is pinned to the delivered-wake seq exactly like `plan_view`, so a re-executed wake turn renders byte-identical ledger bytes and fold-global counters never enter the transcript.
- 0627413: M7-T10: ModelLadder full (docs/07 section 10; docs/04 section 12; FR-119/FR-313). Core: ladders now RESOLVE through the chain (`canonicalizeLadder` validates the declaration once, FR-119 undeclared-judge-rung ConfigError included, and resolves every rung's effort explicitly; `ladderRungChoice` yields the concrete per-rung ModelChoice; a higher concrete layer shadows a lower ladder and vice versa; a ladder that WINS wire resolution stays a typed ConfigError since rung attempts always carry a concrete override). `ladderLengthOf` reads the normative declaration points (profile `model: { ladder }` or the loop-role routing entry). `foldTermination` debits the rung RESPAWN's embedded admission on raising ladder verdicts (docs/07 11.3 b). New per-engine mechanical gate registry `defaults.gates` (`MechanicalGateProfile` over AgentResult.artifacts). The extension seam gains `io.random` (journaled ctx.random for spot-checks), `io.gates`, and dispatch fields `model` (the concrete rung resolution entering the attempt's identity hash), `memoizeOutcome`, and inline `schema` for the engine-synthesized judge. Plan: new `ladder.ts` plus the PlanRunner ladder driver: rung attempts are ordinary agent scopes on the concrete rung model with rung caps binding (tier N+1 = new content key = one live attempt, all sharing the LTID via relation `rung-retry` registered from the raising verdict's `nextAttempt`); triggers classify typed (error, limit, schema-exhausted, no-progress first-class via the abort class, verify-failed from gates only); acceptance gates run per ok attempt in declaration order with journaled `gate-verdict` decisions (mechanical registry profiles, judge on a declared rung >= the executing rung or explicit override with a forced verdict schema and derived identity, spot-check selection strictly via the journaled draw); every ladder verdict is a decision entry computed once live and recovered by content key, so folds consume only journaled values; a denied respawn writes `termination.denied` strictly before the fallback lands; an ok attempt whose acceptance fails with no raise left lands `failed`, never `done`. Mid-flight resume redispatches running nodes through forward matching (dangling attempts continue, settled ones replay instantly): the half-escalated-ladder shape resumes without repaying completed rungs, proven by the truncated-journal test.
- 55c0f87: M7-T11: EscalationProtocol completion (docs/07 section 6; DEF-2/3/4). Core: Flavor B now REQUIRES an explicit `deadlineMs` (the knob has no engine default per the frozen Appendix A row; a flavor B spawn without it is a typed ConfigError before any LLM call); SpawnRecord captures the dispatch's escalation flavor and the WakeDigest escalations block reports it (a flavor B report reaching the digest is already decided by the DEF-4 winner). Plan: new `escalation.ts` with the authoritative `escalation-decision` entry contract (decide-once per report by content key; `countsAgainstLimit` derived from the report kind, XF-06; the counting debit atomic with the append embedding `escalationUnitsAfter`; a DENIED debit writes `termination.denied` strictly before and flips the entry to `capExceeded` with `countsAgainstLimit: false`, so the cap yields the flagged decision plus the final report, never a bare limit, and the folds stay replay-strict). PlanRunner completes the decision flow: the `cancel_task` revision transform on an escalated node lands the verdict `cancel` decision, the `resolve_escalation` plan.decision (origin `escalation-live`), and the severing abandon strictly after the revision append; a settled Flavor B suspension's DEF-4 winner (timeout `defaultDecision` by `timeout`, a live decision, or a class fan-out) is absorbed into the authoritative entry (origins `escalation-default`/`escalation-class`) and the fate applies through the single applier (retry re-opens the node in place with the journaled `amendedPrompt`/`startTier` honored at re-dispatch, accept closes the paid partial result done, cancel closes cancelled, decompose leaves the node escalated while the proposed children enter through `spawn_admitted` ops with FRESH lineages and embedded admissions debiting spawn units through the decision entry).
- fd33871: M7-T12: orchestrator cap and finalize reserve (DEF-7; docs/07 section 12). BREAKING for PlanRunner runs (v0.8.0 registry, docs/12): `orchestratePlanned` now REQUIRES a resolvable orchestrator cap; a run with no USD ceiling and no explicit `budget.capUsd`, or with `effectiveCap < finalizeReserve`, refuses to start with a typed `OrchestratorCapConfigError` BEFORE the first LLM call and before any journal entries (an uncapped orchestrator was precisely the defect; `capFraction` up to 1.0 opts out explicitly). `effectiveCapUsd = min(capUsd, capFraction x runCeiling)`, default fraction 0.2. The engine writes ONE `orchestrator_budget_reserve` decision entry strictly after `termination.init` and strictly before the orchestrator's first agent entry, freezing the cap and the finalize reserve (explicit, or `finalizeTurns` x the deterministic per-turn estimate) in absolute dollars, recovered by content key on resume and never re-evaluated. The reserve registers on the orchestrator account AND the run root (kept separate from committedReserve; the admission block checks add it), so no spawn ever eats the finalization money. At the pre-wake soft boundary (`orchSpent + turnEstimate > effectiveCap - finalizeReserve`) the engine writes exactly ONE `orchestrator_budget_cap` decision strictly before any effects (an in-flight latch closes the wake-ordinal race): the plan freezes for adaptation but not for work (the rebase context `frozen` flag drops every op `plan_frozen` while admitted nodes run to completion), all wake triggers except quiescence disarm, and the orchestrator unwinds to the reserved FINAL wake: a fresh agent entry on the restricted single-`finish` toolset with a `finalizeTurns` limit, paid from the reserve; success yields outcome `ok` with `forcedFinish` marked in the CostReport. If the final finish fails, `orchestrator_finalize_fallback` journals and the engine SYNTHESIZES a deterministic partial result by pure fold with zero LLM calls; the run ends `exhausted` with the non-null partial (`RunOutcome.value` now survives exhaustion). Every digest carries the `WakeBudgetBlock` (run and orchestrator spend, cap, reserve, the epsilon-floored orchestrator share, `softWarning` at 0.8) with `orchestrator:budget` telemetry at each wake boundary and at the cap; `CostReport.orchestrator` populates spentUsd, wakes, forcedFinish, and reserveUsedUsd for H-OrchShare.
- e70e7f4: M7-T13: the FINAL normative WakeDigest in ONE coordinated schema change (docs/07 section 5; XF-08/XF-12, inside the frozen hashVersion-2 identity rules). `WakeDigest` now declares every block first-class: `digestSeq`, `planHash` (emission-time plan hash, empty outside PlanRunner), `coversToOrdinal`, `completedDigests` ordered by spawn ordinal, `escalations` (with the Flavor B `deadlineAt`), the MANDATORY `termination` snapshot (DEF-2, contributed by the PlanRunner extension as a pure fold), the MANDATORY `budget` block (`WakeBudgetBlock`, DEF-7), and the `reuse` stats (the AbandonedSpendView shape, DEF-5). Runs without the PlanRunner extension ship all-zero blocks (`emptyDigestBlocks`), mirroring the CostReport convention. The digest render is bounded deterministically: the new `renderBudgetChars` option clamps each TaskDigest `outputSummary` by CHARACTERS (the model-independent interim measure; the tokenizer choice stays the docs/14 open question, the numeric default TBD before M10). Pinning semantics are unchanged: the digest is part of the wake snapshot and a re-executed turn reads identical bytes.
- bc9c903: M7-T14: the M7 gating cassettes and the remaining metric wiring (docs/09 sections "Metrics" and "Mandatory defect cassette catalog"). Thirteen frozen cassettes record the round-2 set (revise-mid-run, crash-during-revision, park-unpark, oscillation-freeze, half-escalated-ladder, budget-denied-rung), the DEF-7 set minus queue-failover (cap-freeze-then-finish, crash-between-cap-and-effects, finalize-fallback-synthesized, escalation-storm-frozen), and representative DEF-2/DEF-3 rows (revision-exhaustion, rung-retry-lineage, decompose-mints-children), each double-run at record time and replayed byte-for-byte in CI through the new public `@rulvar/plan` cassette runners with deterministic journal normalization (ULIDs, content hashes, wall clock, spans, and refs collapse to first-appearance placeholders). Metric events: `orchestrator:woke` now carries `planHash`, `coversToOrdinal`, and `renderSize` (the deterministic character measure of the delivered digest, the wake-render-size metric); the escalated landing emits `escalation:raised` with the report kind, the lineage attribution, `agentType` (the escalation-rate slice), and `costToDateUsd`; the abandoned/reclaimed/netLost USD view rides every digest through the T13 reuse block and `ledger:op` plus `spawn:*` events already feed ledger-ops-per-spawn.

#### Patch Changes

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

### 0.7.0

#### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

### 0.6.0

#### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

### 0.5.0

#### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

### 0.4.0

#### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

### 0.3.0

#### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

### 0.2.0

#### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

#### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0

## @rulvar/planner

### 1.44.0

#### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0
  - eslint-plugin-rulvar@1.44.0

### 1.43.0

#### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0
  - eslint-plugin-rulvar@1.43.0

### 1.42.0

#### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0
  - eslint-plugin-rulvar@1.42.0

### 1.41.0

#### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0
  - eslint-plugin-rulvar@1.41.0

### 1.40.0

#### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0
  - eslint-plugin-rulvar@1.40.0

### 1.39.0

#### Minor Changes

- 0cff035: Close the dynamic code generation parity gap in the planner sandbox dialect (v1.38.0 review P2-CODEGEN-PARITY).

  `compileScript` and the `rulvar/no-code-generation` ESLint rule now share one AST policy (`scanDialect`), so both reach the same decision for every statically visible constructor reconstruction form: `.constructor`, `["constructor"]`, a computed key that folds to the constant, `{ constructor: x }` destructuring, and `Reflect.get(fn, "constructor")`. The previous regex compile gate matched only the dotted form, so a bracket or computed key passed compile while the linter flagged some of them; moving to an AST also drops the regex false positives, where a property merely named `eval`, `Function`, or `constructor` was wrongly rejected.

  A key assembled only at runtime (`fn[parts.join("")]`) cannot be decided statically without rejecting every dynamic property access, so the worker realm now neutralizes the constructor reconstruction path at runtime by replacing the `constructor` slot on all four Function family prototypes with a thrower. A script that compiles clean can no longer reach the Function constructor through a dynamic key.

  The planner and orchestration docs are corrected to state the exact boundary: the dialect rejects the statically visible forms and the worker neutralizes the runtime path, but a worker in the same process shares its intrinsics with the code it runs and remains a determinism and blast radius boundary, not a hostile code wall.

#### Patch Changes

- Updated dependencies [0cff035]
  - eslint-plugin-rulvar@1.39.0
  - @rulvar/core@1.39.0

### 1.38.0

#### Minor Changes

- 3e2d591: Reject dynamic code generation in the planner sandbox dialect (v1.37.0 review SEC-P2). `compileScript` banned `import` but not `eval`, the `Function` constructor, or `.constructor` access, so a machine script could reach the Function constructor and compile a dynamic import the literal scan never saw, recovering the import allowlist and, through `node:child_process`, arbitrary host capability at run status `ok`. `compileScript` now rejects `eval`, `Function`, and `.constructor` (diagnostic ids `no-eval`, `no-function-constructor`, `no-constructor-access`); a new `rulvar/no-code-generation` ESLint rule carries the same ban into the `workflows` preset and the self repair loop; and the worker additionally unbinds `eval` and `Function` as defense in depth. This keeps the import allowlist meaningful and the dialect consistent. It is not a hostile code boundary, which the sandbox has never claimed to be: JavaScript intrinsics can still reconstruct the constructors, so the docs continue to call the sandbox a determinism and blast radius boundary, not a security one.

#### Patch Changes

- Updated dependencies [3e2d591]
  - eslint-plugin-rulvar@1.38.0
  - @rulvar/core@1.38.0

### 1.37.0

#### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0
  - eslint-plugin-rulvar@1.37.0

### 1.36.0

#### Minor Changes

- 101795b: Validate `PlanOptions.repairRounds` as a nonnegative integer before the runId derivation, the store lookup, and any provider dispatch (v1.35.0 review P2). Unvalidated, NaN produced zero drafts with an `after NaN drafts` rejection, a fraction over ran by a draft, and `Infinity` turned the self repair limiter into an unbounded paid loop.

#### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0
  - eslint-plugin-rulvar@1.36.0

### 1.35.0

#### Minor Changes

- d4ac3bf: Validate `WorkerSandboxRunner` resource ceilings at construction (v1.34.0 review P2-2, P2-3). `timeoutMs` must be an integer between 1 and 2147483647 ms, the Node timer maximum: a larger value used to clamp to a 1 ms timer and kill a trivial worker immediately with `sandbox_limit`. `memoryMb` must be a positive integer. Anything else, NaN included, is a typed `ConfigError` before any worker exists.

#### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0
  - eslint-plugin-rulvar@1.35.0

### 1.34.0

#### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0
  - eslint-plugin-rulvar@1.34.0

### 1.33.0

#### Patch Changes

- @rulvar/core@1.33.0
- eslint-plugin-rulvar@1.33.0

### 1.32.0

#### Patch Changes

- @rulvar/core@1.32.0
- eslint-plugin-rulvar@1.32.0

### 1.31.0

#### Patch Changes

- @rulvar/core@1.31.0
- eslint-plugin-rulvar@1.31.0

### 1.30.0

#### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0
  - eslint-plugin-rulvar@1.30.0

### 1.29.0

#### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0
  - eslint-plugin-rulvar@1.29.0

### 1.28.0

#### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0
  - eslint-plugin-rulvar@1.28.0

### 1.27.0

#### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0
  - eslint-plugin-rulvar@1.27.0

### 1.26.0

#### Patch Changes

- a4fc757: `SqliteStore` implements the exact lookup capability (`getMeta` as a primary key query) and narrows `status`, `statuses`, and `name` in SQL over the JSON payload behind new expression indexes (created idempotently, so existing database files gain them on the next open), so a selective `listRuns` reads only the matching rows instead of decoding the whole catalog; the tags containment check stays in JS over the reduced set with unchanged semantics. The conformance kit checks the `genesis` round trip, that a `statuses` filter never drops a matching meta (supersets stay allowed), and that a store exposing `getMeta` agrees with `listRuns` and resolves `undefined` for a missing run. The planner's deterministic plan lookup reads one meta through the capability instead of scanning the catalog.
- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0
  - eslint-plugin-rulvar@1.26.0

### 1.25.0

#### Minor Changes

- 74851ed: `WorkerSandboxRunner` now launches its worker with an explicit `execArgv` (default `[]`) instead of inheriting the host's `process.execArgv`. Host-only launch flags used to reach the file-entry worker and kill a correct compiled workflow before its first sandbox operation: `--input-type=module` (present whenever the host itself runs as ESM from stdin or `--eval`) is rejected for file entries, and an inherited `--eval` carried the host's whole source text into the worker's options. The same compiled workflow now behaves identically whether the host runs from a file, from stdin, or via `--eval`. Hosts that need loader, coverage, or instrumentation flags inside the worker opt in through the new `WorkerSandboxRunnerOptions.execArgv`, which is passed to the worker verbatim.

#### Patch Changes

- @rulvar/core@1.25.0
- eslint-plugin-rulvar@1.25.0

### 1.24.1

#### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1
  - eslint-plugin-rulvar@1.24.1

### 1.24.0

#### Minor Changes

- 2b033e8: Fix the API card's semantic contract for `tools`, `model`, and `routing` (the v1.23.0 review P2-1 and P2-2). The card now teaches that string entries of `tools` are registered TOOLSET names (exactly the set the profile card prints), never agent profile names, matching the runtime resolver that rejects unknown names with a typed ConfigError before any provider call. The `model` and `routing` bullets now say to normally omit both: the host's profiles and routing decide models, the profile card never names any (model secrecy is a design invariant), and the escape hatch is explicitly conditioned on the goal text itself supplying allowed refs; the false phrase "a model ref from the profile card" is gone. A ConfigError now also stays typed (`code: 'config'`) across the sandbox worker boundary instead of degrading to a generic error, so a compiled script that misuses a profile name in `tools` settles with the typed pre-call outcome and zero provider calls.

  The card text is an identity input of plan operations, so the frozen planner cassettes are re-recorded under the hashVersion-bump token ceremony (the derivation itself is unchanged; CURRENT_HASH_VERSION stays 2).

#### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0
  - eslint-plugin-rulvar@1.24.0

### 1.23.0

#### Minor Changes

- 1f9c272: The API card now tells the planner the truth about identical calls and the complete sanctioned option set (v1.22.0 review P2-4). The card claimed identical calls "journal as ONE result"; the ordinal semantics have always been the opposite: every call journals as its own operation, identical calls share a content key but take sequential ordinals, and repeats always run. The card now states exactly that, plus why a distinguishing `key` still matters (it binds each result to its call by identity instead of position across script edits). The agent opts line is now GENERATED from the runtime allowlist (`SANDBOX_AGENT_OPT_KEYS`, newly exported from `@rulvar/core`), which also surfaces the three options the hand-maintained list had silently dropped: `routing`, `memoizeOutcome`, and `replay`, each with a one-line explanation the model can act on. A parity test pins the card to the runtime allowlist in both directions.

  Identity note (hashVersion-bump ceremony): the card text is an input of the planner operation's content key, so the frozen `planner-self-repair` cassette is re-recorded under the new prompt bytes. The key DERIVATION and `CURRENT_HASH_VERSION` are unchanged; committed journals recorded under the old card replay byte-exact, and only a fresh `plan()` call sees the new prompt identity.

#### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0
  - eslint-plugin-rulvar@1.23.0

### 1.22.0

#### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0
  - eslint-plugin-rulvar@1.22.0

### 1.21.0

#### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0
  - eslint-plugin-rulvar@1.21.0

### 1.20.0

#### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0
  - eslint-plugin-rulvar@1.20.0

### 1.19.0

#### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0
  - eslint-plugin-rulvar@1.19.0

### 1.18.0

#### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0
  - eslint-plugin-rulvar@1.18.0

### 1.17.0

#### Patch Changes

- @rulvar/core@1.17.0
- eslint-plugin-rulvar@1.17.0

### 1.16.2

#### Patch Changes

- @rulvar/core@1.16.2
- eslint-plugin-rulvar@1.16.2

### 1.16.1

#### Patch Changes

- @rulvar/core@1.16.1
- eslint-plugin-rulvar@1.16.1

### 1.16.0

#### Patch Changes

- @rulvar/core@1.16.0
- eslint-plugin-rulvar@1.16.0

### 1.15.0

#### Patch Changes

- @rulvar/core@1.15.0
- eslint-plugin-rulvar@1.15.0

### 1.14.0

#### Patch Changes

- @rulvar/core@1.14.0
- eslint-plugin-rulvar@1.14.0

### 1.13.0

#### Patch Changes

- c28c4c0: Export `RunPlannedOptions` from the package barrel (v1.12 follow-up review, P2). The interface appears in the public `runPlanned` signature but was missing from the explicit type export list of `index.ts`, so a named type import from `@rulvar/planner` failed with TS2459 and the generated API docs rendered the name as unlinked text with no interface page. Runtime behavior is unchanged. The docs build now escalates any TypeDoc referenced-but-not-included warning outside a frozen baseline of pre-existing internal helper types, so a public type missing from its barrel fails CI instead of shipping.
  - @rulvar/core@1.13.0
  - eslint-plugin-rulvar@1.13.0

### 1.12.0

#### Minor Changes

- 46edcc0: Budget-safe planner APIs (v1.11 follow-up review, P2). `PlanOptions.run` carries run options for the planning conversation itself (`budgetUsd`, `limits`, `deadlineAt`, `signal`; the runId stays goal-derived and is not overridable): they apply at GENESIS, where `budgetUsd` freezes as the planning run's immutable ceiling B0, recorded in RunMeta. A later `plan()` of the same goal resumes the existing journal under its RECORDED ceiling: a differing explicit `budgetUsd` emits a `RULVAR_PLAN_BUDGET_DRIFT` warning and never tops up or replaces the frozen value. When the ceiling cannot fit the next draft, `plan()` throws `ScriptRejected` whose data carries `status: 'exhausted'` and the typed `budget_exhausted` error, with zero over-ceiling provider calls and the planning journal intact. `runPlanned(engine, goal, args, options)` gains `RunPlannedOptions { plan?, run? }`: `plan` bounds (and fully parameterizes) the planning leg, `run` is passed to `engine.run` verbatim as the execution leg's own independent RunOptions. Existing calls stay source-compatible; the bare forms without options remain UNBOUNDED and are now documented as such, with the bounded form shown first in the planner and orchestration-modes guides.

#### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0
  - eslint-plugin-rulvar@1.12.0

### 1.11.0

#### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0
  - eslint-plugin-rulvar@1.11.0

### 1.10.0

#### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0
  - eslint-plugin-rulvar@1.10.0

### 1.9.0

#### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0
  - eslint-plugin-rulvar@1.9.0

### 1.8.0

#### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0
  - eslint-plugin-rulvar@1.8.0

### 1.7.0

#### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0
  - eslint-plugin-rulvar@1.7.0

### 1.6.0

#### Patch Changes

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
  - eslint-plugin-rulvar@1.6.0

### 1.5.2

#### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2
  - eslint-plugin-rulvar@1.5.2

### 1.5.1

#### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1
  - eslint-plugin-rulvar@1.5.1

### 1.5.0

#### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0
  - eslint-plugin-rulvar@1.5.0

### 1.4.0

#### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0
  - eslint-plugin-rulvar@1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2
  - eslint-plugin-rulvar@1.3.2

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1
  - eslint-plugin-rulvar@1.3.1

### 1.3.0

#### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0
  - eslint-plugin-rulvar@1.3.0

### 1.2.0

#### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0
  - eslint-plugin-rulvar@1.2.0

### 1.1.0

#### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0
  - eslint-plugin-rulvar@1.1.0

### 1.0.0

#### Patch Changes

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
  - eslint-plugin-rulvar@1.0.0

### 0.9.0

#### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0
  - eslint-plugin-rulvar@0.9.0

### 0.8.0

#### Patch Changes

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
  - eslint-plugin-rulvar@0.8.0

### 0.7.0

#### Minor Changes

- dc1c182: M6-T01: compileScript and the CompiledWorkflow surface. `compileScript(source, { allowImports })` validates planner-generated source (syntax over the exact sandbox global set; import/require/export scanning with a literal-specifier allowlist defaulting to none) and compiles it into the core `CompiledWorkflow` data form (errorPolicy 'lenient'); any violation throws the typed `ScriptRejected` carrying machine-readable `ScriptDiagnostic[]` for the plan() self-repair loop. Exports `SANDBOX_GLOBALS` (the docs/06 8.2 curated list) and `scriptDiagnosticsOf`. The closure Workflow and CompiledWorkflow forms stay mutually unassignable by type.
- fd1d06c: M6-T02: WorkerSandboxRunner and the sandbox contract. `@rulvar/planner` gains `WorkerSandboxRunner` (accepts CompiledWorkflow ONLY; worker_threads with the exact curated 12-global scope; timeoutMs 300000 / memoryMb 512 breaches terminate the worker with the new typed `SandboxError`, code `sandbox_limit`). Core gains the public host half, `createSandboxBridge`: proxied primitives (agent, step, workflow, awaitExternal, parallel, pipeline, phase, budget) served against the canonical run ctx with worker thunks executing under host-allocated scope tokens; the worker's SYNC seeded now/random/uuid (and the Date.now/Math.random replacements) mirror-journal as ordinary kind `rand` entries with match-first resume semantics; a busy-state protocol keeps suspension and quiescence behavior identical to in-process runs. `createEngine` gains `runners.sandbox`; `engine.run`/`engine.resume` accept CompiledWorkflow, persist the source blob plus workflowSourceRef/workflowHash at start, and `resume(runId)` with no workflow rehydrates the hash-pinned source (a differing supplied source is a typed ConfigError). New `FileTranscriptStore` makes compiled runs resumable across processes. The sandbox dialect exposes async `budget.spent()/remaining()`; import/fetch/process are absent from the worker scope.
- 6fcf296: M6-T04: profileCard and the API card. Core gains `profileCard(profiles)`: the one agent vocabulary both orchestration modes speak, feeding the planner prompt (mode b) and spawn_agent agentType guidance (mode c) with IDENTICAL text; pure function of the registry, sorted, byte-stable, rendering only model-agnostic fields (name, description, tool names, taskClass, estCost, escalation opt-in; models are never named). The planner gains `apiCard()`: the byte-stable card teaching exactly the curated 12-global sandbox dialect (schema literals only, tools by profile name, onError throw|null, async budget, no imports, the opts.key repeat rule) with usage patterns distilled from the examples corpus.
- dcc97a9: M6-T05: the plan agent and the self-repair loop (mode b). `plan(engine, goal, { model?, profiles?, repairRounds? })` asks a planner model under role `plan` to write a script against the API card plus the engine's profile card, lints it (eslint-plugin-rulvar preset + compileScript), self-repairs up to repairRounds (default 3) from the machine-readable JSON diagnostics, and returns `{ source, workflow, lint }`. The planner conversation is an ordinary journaled run with a goal-derived deterministic runId, so re-planning the same goal replays the unchanged prefix free; exhausting the rounds throws a typed ScriptRejected carrying the last diagnostics. `runPlanned(engine, goal, args?)` composes plan-then-sandbox-run (async by amendment). Core gains `AgentOpts.role` (`'loop' | 'plan' | 'orchestrate'`, the primary invocation role threading through resolution, effort defaults, floors, cost buckets, and events) and the narrow `Engine.profileCard(names?)` accessor rendering the registered profiles through the public API.
- 10b45f1: M6-T11: the rulvar plan command and the M6 gating cassettes. `rulvar plan "<goal>" [--dry-run]` (the canonical grammar) loads @rulvar/planner DYNAMICALLY (the CLI's static dependency stays @rulvar/core; a missing install is a clear error), plans against the host-config engine, prints the accepted script plus its advisory diagnostics, and runs it in the worker sandbox unless --dry-run. The three docs/09 6.10 gating cassettes are recorded on the FakeAdapter and committed under the frozen-fixture lock with exported scenario builders shared by the recorder script and the replay tests: sandbox-determinism (two fresh runs of one CompiledWorkflow produce byte-identical normalized journals matching the cassette), planner-self-repair (the failing draft round-trips through the JSON-diagnostics repair, re-planning from the committed journal is free, and the accepted script executes deterministically in the sandbox), and orchestrator-crash-resume (the committed pre-crash journal plus boundary checkpoints resume with zero re-paid spawns, no duplicate spawn decisions, and byte-stable handles).

#### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [4aaf2d5]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0
  - eslint-plugin-rulvar@0.7.0

### 0.6.0

#### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0
  - eslint-plugin-rulvar@0.6.0

### 0.5.0

#### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0
  - eslint-plugin-rulvar@0.5.0

### 0.4.0

#### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0
  - eslint-plugin-rulvar@0.4.0

### 0.3.0

#### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0
  - eslint-plugin-rulvar@0.3.0

### 0.2.0

#### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0
  - eslint-plugin-rulvar@0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

#### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0
  - eslint-plugin-rulvar@0.1.0

## @rulvar/rulvar

### 1.44.0

#### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0
  - @rulvar/anthropic@1.44.0
  - @rulvar/openai@1.44.0

### 1.43.0

#### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0
  - @rulvar/anthropic@1.43.0
  - @rulvar/openai@1.43.0

### 1.42.0

#### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0
  - @rulvar/anthropic@1.42.0
  - @rulvar/openai@1.42.0

### 1.41.0

#### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0
  - @rulvar/anthropic@1.41.0
  - @rulvar/openai@1.41.0

### 1.40.0

#### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0
  - @rulvar/anthropic@1.40.0
  - @rulvar/openai@1.40.0

### 1.39.0

#### Patch Changes

- @rulvar/anthropic@1.39.0
- @rulvar/core@1.39.0
- @rulvar/openai@1.39.0

### 1.38.0

#### Patch Changes

- @rulvar/anthropic@1.38.0
- @rulvar/core@1.38.0
- @rulvar/openai@1.38.0

### 1.37.0

#### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0
  - @rulvar/anthropic@1.37.0
  - @rulvar/openai@1.37.0

### 1.36.0

#### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0
  - @rulvar/anthropic@1.36.0
  - @rulvar/openai@1.36.0

### 1.35.0

#### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0
  - @rulvar/anthropic@1.35.0
  - @rulvar/openai@1.35.0

### 1.34.0

#### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0
  - @rulvar/anthropic@1.34.0
  - @rulvar/openai@1.34.0

### 1.33.0

#### Patch Changes

- @rulvar/anthropic@1.33.0
- @rulvar/openai@1.33.0
- @rulvar/core@1.33.0

### 1.32.0

#### Patch Changes

- @rulvar/anthropic@1.32.0
- @rulvar/openai@1.32.0
- @rulvar/core@1.32.0

### 1.31.0

#### Patch Changes

- Updated dependencies [df6b8f8]
  - @rulvar/openai@1.31.0
  - @rulvar/anthropic@1.31.0
  - @rulvar/core@1.31.0

### 1.30.0

#### Patch Changes

- Updated dependencies [87ce985]
- Updated dependencies [87ce985]
  - @rulvar/openai@1.30.0
  - @rulvar/anthropic@1.30.0
  - @rulvar/core@1.30.0

### 1.29.0

#### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0
  - @rulvar/openai@1.29.0
  - @rulvar/anthropic@1.29.0

### 1.28.0

#### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0
  - @rulvar/openai@1.28.0
  - @rulvar/anthropic@1.28.0

### 1.27.0

#### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0
  - @rulvar/anthropic@1.27.0
  - @rulvar/openai@1.27.0

### 1.26.0

#### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0
  - @rulvar/anthropic@1.26.0
  - @rulvar/openai@1.26.0

### 1.25.0

#### Patch Changes

- @rulvar/anthropic@1.25.0
- @rulvar/core@1.25.0
- @rulvar/openai@1.25.0

### 1.24.1

#### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1
  - @rulvar/anthropic@1.24.1
  - @rulvar/openai@1.24.1

### 1.24.0

#### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0
  - @rulvar/anthropic@1.24.0
  - @rulvar/openai@1.24.0

### 1.23.0

#### Patch Changes

- 1f9c272: The renderers' remaining unsanitized paths and the malformed-event gaps (v1.22.0 review P2-2, P2-3).

  - `progress()`: the error text surfaced when the SOURCE fails (a rejected `RunHandle.result`, a rejected `Promise<RunHandle>`, a throwing iterable) went to the sink raw; a crafted rejection could inject ANSI, forge lines, and leak a key-shaped fragment. Every catch path now routes through one helper that secret-masks FIRST (the thrown value never crossed the event masking boundary) and terminal-sanitizes second; lines mode prints the notice as its own sanitized line instead of dropping it.
  - Malformed recognized events from a raw iterable can no longer stop a view: every dynamic field in the `progress()` reducer, its lines formatter, `renderProgress`, and the CLI `renderEventLine` is read through typed guards (a hostile object with a throwing `toString` included), a backstop catch skips a bad event with a bounded diagnostic carrying no untrusted data, and the stream continues. The v1.22.0 claim of full defensive reads was narrower in reality (`agent:stream` without `delta` or `phase:start` without `phase` stopped the raw-iterable view); it is true now and pinned by a table-driven test over every consumed type.
  - `posIntOption` wording: a below-minimum value CLAMPS to the minimum (only non-finite values fall back to the default); the JSDoc said "falls back" for both.
  - `@rulvar/cli` build config migrates the deprecated tsdown `external` option to `deps.neverBundle`; the packed dist keeps the companion specifiers external, byte-for-same behavior.

- Updated dependencies [1f9c272]
- Updated dependencies [1f9c272]
  - @rulvar/anthropic@1.23.0
  - @rulvar/core@1.23.0
  - @rulvar/openai@1.23.0

### 1.22.0

#### Patch Changes

- 77b554f: Harden the terminal progress renderers (v1.21.0 review). Both `progress` (its lines mode and the tty state, plus the `title` option) and the minimal `renderProgress` now pass every untrusted field through the shared `sanitizeTerminalText` sanitizer, so control characters and ANSI escape sequences in provider/tool/log strings can no longer clear the screen, recolor to forge text, or inject extra lines (P2-1). `progress` geometry and timing options are normalized to finite positive integers: a non-finite or below-minimum `fps`, `width`, `maxRows`, `sink.columns`, or `sink.rows` falls back instead of breaking the clip or creating a NaN-interval timer, the width clip now holds every rendered line strictly under the terminal width for every width (including 1 to 3), and a NaN or backward clock reading renders a zero timer rather than `NaN` (P3-2). The clock JSDoc is corrected to `performance.now`, and every dynamic field is read defensively so a recognized event missing a required field degrades a row instead of stopping the view.
- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0
  - @rulvar/anthropic@1.22.0
  - @rulvar/openai@1.22.0

### 1.21.0

#### Minor Changes

- 7ee42a0: New live terminal progress view: `progress(source, options)` renders a claude-workflows-style tree over the WorkflowEvent stream with one row per agent (status glyph, running timer, token counts, USD), per-role sub-timings when one call spans several invocation phases, the run header with spend against the ceiling, banners for pending approvals and externals, and a final summary including the per-role dollar split from `RunOutcome.cost.byRole`. Accepts a `RunHandle` (subscribes via `on()`, leaving `handle.events` free), a promise of one, or a raw event iterable (the gapless resume path). TTY mode repaints in place at a bounded rate; pipes and CI degrade to append-only lines; `NO_COLOR`, injectable sink and clock, and stderr-only output keep it deterministic and clean. The minimal `renderProgress` is unchanged.

#### Patch Changes

- Updated dependencies [7ee42a0]
- Updated dependencies [7ee42a0]
- Updated dependencies [7ee42a0]
  - @rulvar/anthropic@1.21.0
  - @rulvar/core@1.21.0
  - @rulvar/openai@1.21.0

### 1.20.0

#### Patch Changes

- Updated dependencies [9367030]
- Updated dependencies [9367030]
  - @rulvar/core@1.20.0
  - @rulvar/openai@1.20.0
  - @rulvar/anthropic@1.20.0

### 1.19.0

#### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0
  - @rulvar/openai@1.19.0
  - @rulvar/anthropic@1.19.0

### 1.18.0

#### Minor Changes

- 943962d: `recommendedDefaults.floors` now admits `openai:gpt-5.6-sol` and its published exact alias `openai:gpt-5.6` for the `orchestrate` and `plan` roles. The allowlists had fallen behind the product recommendation: the rulvar.com quickstart routes the orchestrator at Sol, but a configuration combining that recommendation with the recommended floors was rejected before any provider call with a quality-floor violation. The weaker family siblings Terra and Luna stay deliberately floored out of the control-plane roles; worker roles (`loop`, `extract`) remain unfloored.

#### Patch Changes

- Updated dependencies [943962d]
- Updated dependencies [943962d]
  - @rulvar/core@1.18.0
  - @rulvar/openai@1.18.0
  - @rulvar/anthropic@1.18.0

### 1.17.0

#### Patch Changes

- @rulvar/anthropic@1.17.0
- @rulvar/core@1.17.0
- @rulvar/openai@1.17.0

### 1.16.2

#### Patch Changes

- Updated dependencies [9f07130]
  - @rulvar/anthropic@1.16.2
  - @rulvar/core@1.16.2
  - @rulvar/openai@1.16.2

### 1.16.1

#### Patch Changes

- Updated dependencies [fac1ecc]
  - @rulvar/anthropic@1.16.1
  - @rulvar/core@1.16.1
  - @rulvar/openai@1.16.1

### 1.16.0

#### Patch Changes

- Updated dependencies [5f76cf2]
  - @rulvar/anthropic@1.16.0
  - @rulvar/openai@1.16.0
  - @rulvar/core@1.16.0

### 1.15.0

#### Patch Changes

- Updated dependencies [4aee1f3]
- Updated dependencies [4aee1f3]
  - @rulvar/anthropic@1.15.0
  - @rulvar/openai@1.15.0
  - @rulvar/core@1.15.0

### 1.14.0

#### Patch Changes

- @rulvar/anthropic@1.14.0
- @rulvar/openai@1.14.0
- @rulvar/core@1.14.0

### 1.13.0

#### Patch Changes

- @rulvar/anthropic@1.13.0
- @rulvar/core@1.13.0
- @rulvar/openai@1.13.0

### 1.12.0

#### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0
  - @rulvar/anthropic@1.12.0
  - @rulvar/openai@1.12.0

### 1.11.0

#### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0
  - @rulvar/anthropic@1.11.0
  - @rulvar/openai@1.11.0

### 1.10.0

#### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0
  - @rulvar/anthropic@1.10.0
  - @rulvar/openai@1.10.0

### 1.9.0

#### Patch Changes

- Updated dependencies [7577f8e]
- Updated dependencies [3a53383]
  - @rulvar/anthropic@1.9.0
  - @rulvar/openai@1.9.0
  - @rulvar/core@1.9.0

### 1.8.0

#### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0
  - @rulvar/anthropic@1.8.0
  - @rulvar/openai@1.8.0

### 1.7.0

#### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0
  - @rulvar/anthropic@1.7.0
  - @rulvar/openai@1.7.0

### 1.6.0

#### Patch Changes

- da4dbad: Write the product name as Rulvar in prose: package READMEs, npm descriptions, and the
  documentation site now capitalize the brand. Identifiers keep their exact casing, so
  package names, the `rulvar` binary, `rulvar.config.mjs`, the `.rulvar` store directory,
  the `rulvar.*` OTel attributes, and every URL are unchanged. Documentation and metadata
  only; no runtime behaviour changes.
- Updated dependencies [da4dbad]
- Updated dependencies [487da86]
- Updated dependencies [df416fc]
- Updated dependencies [886d065]
- Updated dependencies [a737810]
- Updated dependencies [9eb66b4]
  - @rulvar/anthropic@1.6.0
  - @rulvar/core@1.6.0
  - @rulvar/openai@1.6.0

### 1.5.2

#### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2
  - @rulvar/anthropic@1.5.2
  - @rulvar/openai@1.5.2

### 1.5.1

#### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1
  - @rulvar/anthropic@1.5.1
  - @rulvar/openai@1.5.1

### 1.5.0

#### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0
  - @rulvar/anthropic@1.5.0
  - @rulvar/openai@1.5.0

### 1.4.0

#### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0
  - @rulvar/anthropic@1.4.0
  - @rulvar/openai@1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/anthropic@1.3.2
  - @rulvar/core@1.3.2
  - @rulvar/openai@1.3.2

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/anthropic@1.3.1
  - @rulvar/core@1.3.1
  - @rulvar/openai@1.3.1

### 1.3.0

#### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0
  - @rulvar/anthropic@1.3.0
  - @rulvar/openai@1.3.0

### 1.2.0

#### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0
  - @rulvar/anthropic@1.2.0
  - @rulvar/openai@1.2.0

### 1.1.0

#### Patch Changes

- Updated dependencies [f2253cb]
- Updated dependencies [63b2c01]
- Updated dependencies [99dc3ed]
- Updated dependencies [d16b04a]
  - @rulvar/anthropic@1.1.0
  - @rulvar/core@1.1.0
  - @rulvar/openai@1.1.0

### 1.0.0

#### Patch Changes

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
  - @rulvar/anthropic@1.0.0
  - @rulvar/openai@1.0.0

### 0.9.0

#### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0
  - @rulvar/anthropic@0.9.0
  - @rulvar/openai@0.9.0

### 0.8.0

#### Patch Changes

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
  - @rulvar/anthropic@0.8.0
  - @rulvar/openai@0.8.0

### 0.7.0

#### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0
  - @rulvar/anthropic@0.7.0
  - @rulvar/openai@0.7.0

### 0.6.0

#### Minor Changes

- fa05007: M5-T01 workflow registry and the @rulvar/cli base.

  - `@rulvar/core` gains the per-engine `WorkflowRegistry` type and
    `defaults.workflows` on createEngine (docs/06 section 10.4): an
    explicit first-class value, no module-level registry; shells resolve
    by-name runs against it (ctx.workflow's string form arrives M6, the
    queue worker M8).
  - Spec-conformance fix: the M4-T09 quality floors option moves from the
    createEngine top level to its canonical home `defaults.roleFloors`
    (docs/06 section 10.1). Update `createEngine({ floors })` call sites
    to `createEngine({ defaults: { roleFloors } })`.
  - `@rulvar/cli` ships its first real surface: the canonical grammar
    `rulvar run <file|name> [--args JSON] [--store PATH] [--budget-usd N]`,
    `rulvar resume <runId> [--args JSON] [--store PATH]`,
    `rulvar runs ls [--store PATH]`, `rulvar inspect &lt;runId&gt; [--store
PATH]` (no aliases), a line-oriented TUI progress renderer over the
    event stream, and interactive resolution of suspended approvals and
    externals (EOF leaves the run suspended, never errors). Engine
    assembly follows the host-config convention: `rulvar.config.mjs`
    default-exports `{ engineOptions?, workflows? }`, a workflow module
    may export `workflow`/`engineOptions`/`workflows`, and --store selects
    the JsonlFileStore directory (default `.rulvar`), so the CLI itself
    depends only on @rulvar/core. The `rulvar` bin is included; the
    resume/inspect grammar amendment (--args re-supply, --store symmetry)
    is recorded in docs/06 section 10.5.

#### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0
  - @rulvar/anthropic@0.6.0
  - @rulvar/openai@0.6.0

### 0.5.0

#### Minor Changes

- b840aba: M4-T08 canonical effort completion and M4-T09 role quality floors.

  - Effort semantics are complete: the role effort defaults and the
    per-adapter mapping tables (Anthropic passthrough including max,
    OpenAI max downmapped to xhigh and recorded in providerMetadata,
    provider none only via namespaced providerOptions) shipped earlier
    milestones; this change completes VISIBLE scrubbing everywhere it was
    still silent: the summarize invocation surfaces its scrubs at fire
    time and a failover takeover surfaces the fallback's scrubs the
    moment it starts serving. Scrubbed effort is never mapped into
    max_tokens.
  - The effort-defaults-shift cassette is now RECORDED through the live
    runtime (docs/10 M4 gating row): the frozen v1 prefix, closed offline
    the way an operator would, resumes live under explicit high effort
    with the completed semantics; every v1 entry matches and the one new
    spawn carries canonical effort in v2 identity. The recorder output is
    pinned byte-for-byte by the frozen-drift suite and the fixture lock
    now covers 18 files.
  - Quality floors (`model/floors.ts`, M4-T09): per-role and
    per-declared-taskClass allow/deny lists supplied via
    `createEngine({ floors })`, enforced INSIDE the router at resolution,
    before any live call and before any journal entry, for every
    invocation the chain produces (primaries, failover fallbacks, and the
    summarize fallback alike). `AgentProfile.taskClass` declares the
    class; unclassified profiles see only byRole floors. A violation is a
    typed ConfigError.
  - The umbrella `rulvar` package now ships floors opinions next to its
    strong routing defaults: `recommendedDefaults.floors` pins orchestrate
    and plan to strong named models. The core itself ships no named model
    strings, and the umbrella suite enforces that with a source scan.

#### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0
  - @rulvar/anthropic@0.5.0
  - @rulvar/openai@0.5.0

### 0.4.0

#### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0
  - @rulvar/openai@0.4.0
  - @rulvar/anthropic@0.4.0

### 0.3.0

#### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0
  - @rulvar/anthropic@0.3.0
  - @rulvar/openai@0.3.0

### 0.2.0

#### Minor Changes

- c24228d: M1-T10/T11: the WorkflowEvent envelope and M1 catalog (per-run telemetry
  seq distinct from JournalEntry.seq, span hierarchy run > phase > agent),
  the per-run EventBus feeding RunHandle.events and on(), RunOutcome with
  exhausted-overrides-error precedence and the normative CostReport
  (byModel/byPhase/byAgentType/byRole, the all-zero orchestrator block,
  unpriced evidence); createEngine with per-engine registries and
  engine.run over the ScriptRunner seam; InProcessRunner with the dev-mode
  bare-Date.now/Math.random warnings; run cancellation (host signal,
  handle.cancel, run deadline) and RunMeta run-to-definition binding
  fields. The umbrella ships the minimal terminal progress renderer
  (renderProgress) and re-exports the core surface.
- 5c4fc32: M1-T14/T15: @rulvar/testing tier 1 (FakeAdapter matching on
  agentType/label/prompt regex with a '*' fallback, honoring the selected
  structured-output tier, zero USD by construction; createTestEngine over
  the full real engine with recorded event streams; toHaveCalledAgent and
  toStayUnderBudget matchers at '@rulvar/testing/matchers') and the
  completed umbrella (re-exports of @rulvar/core and both first-class
  adapters, renderProgress, the umbrella-only recommendedDefaults strong
  model slots, the M1 exit-criteria example workflow, and the CI install
  smoke on packed tarballs). The core now populates the reserved
  providerOptions 'rulvar' telemetry namespace on every request (docs/04
  section 1.8 as amended) and AgentResult carries errorMessage detail for
  journaled WireError fidelity.

#### Patch Changes

- Updated dependencies [527c9b4]
- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/anthropic@0.2.0
  - @rulvar/openai@0.2.0
  - @rulvar/core@0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

#### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/anthropic@0.1.0
  - @rulvar/core@0.1.0
  - @rulvar/openai@0.1.0

## @rulvar/store-conformance

### 1.44.0

#### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0

### 1.43.0

#### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

### 1.42.0

#### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

### 1.41.0

#### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

### 1.40.0

#### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

### 1.39.0

#### Patch Changes

- @rulvar/core@1.39.0

### 1.38.0

#### Patch Changes

- @rulvar/core@1.38.0

### 1.37.0

#### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

### 1.36.0

#### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

### 1.35.0

#### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

### 1.34.0

#### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

### 1.33.0

#### Patch Changes

- @rulvar/core@1.33.0

### 1.32.0

#### Patch Changes

- @rulvar/core@1.32.0

### 1.31.0

#### Patch Changes

- @rulvar/core@1.31.0

### 1.30.0

#### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

### 1.29.0

#### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

### 1.28.0

#### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

### 1.27.0

#### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

### 1.26.0

#### Minor Changes

- a4fc757: `SqliteStore` implements the exact lookup capability (`getMeta` as a primary key query) and narrows `status`, `statuses`, and `name` in SQL over the JSON payload behind new expression indexes (created idempotently, so existing database files gain them on the next open), so a selective `listRuns` reads only the matching rows instead of decoding the whole catalog; the tags containment check stays in JS over the reduced set with unchanged semantics. The conformance kit checks the `genesis` round trip, that a `statuses` filter never drops a matching meta (supersets stay allowed), and that a store exposing `getMeta` agrees with `listRuns` and resolves `undefined` for a missing run. The planner's deterministic plan lookup reads one meta through the capability instead of scanning the catalog.

#### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

### 1.25.0

#### Patch Changes

- @rulvar/core@1.25.0

### 1.24.1

#### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

### 1.24.0

#### Minor Changes

- 2b033e8: Record the genesis args binding in RunMeta and make the dry-run preview mutation-free (the v1.23.0 review). `RunMeta` gains `argsProvided` (whether the run started with defined args) and `argsHash` (sha256 over the JCS canonical serialization of the genesis args, never the raw value), written by the engine at genesis and preserved verbatim by every resume segment, so hosts can refuse a resume whose re-supplied args silently diverge from the original invocation; the new public `hashRunArgs()` derives the same hash host-side. Legacy metas never gain the marker retroactively, and unserializable args record presence without a hash. A `dryRun` resume now performs ZERO store mutations by invariant: `putMeta` is skipped entirely (no status flip, no `segments` bump), the compiled-source blob is not re-put, and the Replayer's single append site refuses any journal append under replay-strict with a typed `JournalMissError`. The store conformance kit checks the round-trip of both new fields.

#### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

### 1.23.0

#### Minor Changes

- 1f9c272: PlanRunner spawn telemetry, the missing evals export, and the conformance kit's new meta field (v1.22.0 review P2-5, P2-6, P1-2).

  - `@rulvar/plan`: PlanRunner journals every admission INSIDE a carrying entry (decomposition rows in escalation decisions, ladder-verdict respawns, reuse and graft links, revision admissions) and emitted no `spawn:admitted`/`spawn:rejected` at all; a live PlanRunner run with admitted roots showed an event count of zero. Every embedded admission row now announces through one formatter, identically on the live path and on replay absorb, with `replayed: true` on recovered rows, `entryRef` on the journaled carrying entry, and `agentType` resolved from the landed specs.
  - `@rulvar/evals`: `agentTypeRuleHolds` joins the package root next to `rungRuleHolds`, exactly as the v1.21.0 changelog had already announced; a public-API test now imports the checkpoint quartet from the root. The evals guide gains a full measured-value checkpoint section (ladder/pool/cell/arm vocabulary, both criteria, the vacuous-pass guard, cost discipline, a runnable example).
  - `@rulvar/store-conformance`: the meta round-trip case now also pins the new optional `RunMeta.segments` field, which the engine bumps durably at every resume to keep event `seq`/`spanId` unique per run.

#### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

### 1.22.0

#### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

### 1.21.0

#### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

### 1.20.0

#### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

### 1.19.0

#### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

### 1.18.0

#### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

### 1.17.0

#### Patch Changes

- @rulvar/core@1.17.0

### 1.16.2

#### Patch Changes

- @rulvar/core@1.16.2

### 1.16.1

#### Patch Changes

- @rulvar/core@1.16.1

### 1.16.0

#### Patch Changes

- @rulvar/core@1.16.0

### 1.15.0

#### Patch Changes

- @rulvar/core@1.15.0

### 1.14.0

#### Patch Changes

- @rulvar/core@1.14.0

### 1.13.0

#### Patch Changes

- @rulvar/core@1.13.0

### 1.12.0

#### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

### 1.11.0

#### Minor Changes

- 0c70c5e: New mandatory obligation A5, monotonic seq: three new checks reject stores that persist duplicate or stale seqs. `a5-monotonic-seq` (a duplicate or stale append rejects with code `journal_order_violation` and never becomes visible, while the true next seq still lands), `a5-stale-tail-race` (two writers appending the same next seq: exactly one persists, the loser observes the typed conflict, reload shows a strictly increasing order), and `a5-stale-replayer-fencing` (the same race driven through two kernel Replayers from one loaded tail). The `CommunityMemoryStore` walkthrough listing gains the guard in step with `docs/guide/store-authors.md`. Third-party stores that pass the previous kit but accept duplicate seqs will fail the new checks until they add the guard; the obligation is documented in `guide/stores` and `guide/store-authors`.

#### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

### 1.10.0

#### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

### 1.9.0

#### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

### 1.8.0

#### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

### 1.7.0

#### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

### 1.6.0

#### Patch Changes

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

### 1.5.2

#### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

### 1.5.1

#### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

### 1.5.0

#### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

### 1.4.0

#### Minor Changes

- c4f563d: Production readiness fixes from the July 2026 full audit.

  - The `budgetUsd` ceiling now survives resume: the engine records it in `RunMeta.budgetUsd` and restores it on every resume, so the replayed spend counts against the original invocation's bound and `ResumeOptions` still exposes no way to raise it. Journals written before the field existed (or read through a store that drops optional `RunMeta` fields) resume uncapped, exactly as before; the conformance kit gains a round-trip check so custom stores cannot drop the field silently.
  - `spawn:rejected` and `resolution:applied` / `resolution:superseded` are now emitted: live admission rejections carry the rejection `code`, `agentType`, and the journaled decision `entryRef` (absent only for pre-admission config gates), and live resolution attempts report winning or losing the first-closing-wins fold. `spawn:admitted` now carries the decision `entryRef` and the admitting `verdict` arm. The `orchestrator:budget` union member now types the two payload shapes actually emitted; `journal:compat` stays declared but unemitted (the scan runs before a run's event stream exists) and its TSDoc says so.
  - `toOtel` implements real parent-child span nesting when `contextApi` and `setSpan` are passed; without them spans stay flat but attributed.

  - `'readonly'` isolation now compiles a deny rule for tools declaring risk `write` or `destructive` into the spawn's permission chain, exactly as the tools guide documents; read tools and other isolation modes are unaffected.
  - VCR `replay()` refuses a cassette recorded outside the engine's hashVersion support window (`[CURRENT-1, CURRENT]`) with a typed `ConfigError` instead of silently drifting; in-window cassettes replay as before.
  - `InMemoryStore` accepts `{ quiet: true }` to opt out of the durability warning, and the warning text now states the precise truth: nothing survives a process exit and cross-process resume is impossible (same-process resume of a kept instance works). `createTestEngine` constructs its store quietly, so the blessed offline tier no longer prints a misleading warning.
  - The bare `Date.now()` / `Math.random()` development warnings no longer blame workflow code for calls that originate in library internals (the engine's own retry jitter, provider SDKs): the retry jitter uses a natively captured `Math.random`, and the in-process guard skips callers that live under `node_modules`.
  - `rulvar run --profile` now applies the profile's per-role effort hints: entries in `defaults.routing` that carry no effort are seeded from `RunProfile.effortByRole` (an explicit host effort always wins; ladder entries and unrouted roles stay untouched).
  - `rulvar --help` documents the shipped `kb inbox` and `kb gate` subcommands.
  - The unscoped `rulvar` pointer package ships TypeScript declarations (`index.d.ts` with a `types` export condition), so strict TypeScript projects can import the bare name; the install smoke gate now packs and checks the pointer alongside the umbrella.

#### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

### 1.3.0

#### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

### 1.2.0

#### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

### 1.1.0

#### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

### 1.0.0

#### Minor Changes

- 5f0fdcd: M9-T03: community adapter and store guides (docs/10 section 3.10; docs/11 M9 exit row "conformance kits published as community guides").

  - New informative docs: `docs/guide-adapter-authors.md` (wire mapping requirements, the Usage invariant checklist, caps posture, an adapter skeleton template, and the VCR-based contract-test pattern with record and hermetic replay legs) and `docs/guide-store-authors.md` (the storage contracts A1-A4 plus leasing and fencing, a complete minimal LeasableStore walkthrough with an injectable clock and release-surviving epochs, conformance kit wiring, common failure modes, and publishing checklists). Both are indexed in the docs README inventory.
  - @rulvar/store-conformance gains the dogfood suite: the guide's CommunityMemoryStore walkthrough listing runs VERBATIM through journalStoreConformance and leasableStoreConformance in CI, so the acceptance ("a third-party mock store built only from the guide passes conformance") holds permanently and the guide's code cannot rot.

#### Patch Changes

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

### 0.9.0

#### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

### 0.8.0

#### Patch Changes

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

### 0.7.0

#### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

### 0.6.0

#### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

### 0.5.0

#### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

### 0.4.0

#### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

### 0.3.0

#### Minor Changes

- 43444f6: M2-T11/T12: the executable store conformance kit and the M2 gating
  cassettes with frozen fixtures.

  @rulvar/store-conformance ships its first real API: journalStoreConformance
  (A1 append atomicity, A2 total per-run order, A3 read-your-writes, A4
  opaque payload with read-side-only normalization, meta separation, the
  golden fold-state fixture with a frozen reference hash, the decide-once
  oracle, and the abandon-derived-skip fixture) and leasableStoreConformance
  (typed LeaseHeldError on held acquire, monotonic fencing epochs,
  stale-epoch appends rejected and invisible, released leases fenced from
  renew and append, optional ttl/renew-cadence timing checks), plus
  registerConformance for Vitest/Jest and the stableStringify fold-state
  hasher. InMemoryStore and JsonlFileStore pass; deliberately broken stores
  (reordering, normalizing, tearing, fencing-less) fail loudly.

  @rulvar/core kernel closes three DEF-1/DEF-4 gaps the cassettes gate: an
  abandon-covered hanging dispatch derives skipped instead of redispatching,
  abandon-covered operations contribute a zero ledger increment, the resume
  report lists covered entries as skipped (never orphaned), and an abandon
  over an already-resolved suspension folds to a noop with already_resolved
  (first-closing-wins per target, both closer kinds).

  @rulvar/testing ships the M2 cassette suite over committed frozen
  fixtures: the DEF-1 synthetic subset (abandon-subtree, memoize-classifier,
  v1-journal-on-v2), the DEF-4 set (timeout-vs-live-race,
  class-decision-fanout, abandon-then-crash-then-resume,
  abandon-vs-resolution-race, offline-invalid-then-valid,
  double-abandon-idempotent), the DEF-6 six IDs (resume-v1-on-engine-v2,
  resume-v1-with-inserted-call, suspended-v1-resolves-on-v2,
  reject-version-too-old via deriverV0Synthetic, reject-version-from-future,
  effort-defaults-shift), the mandatory mixed-version scenarios
  (ordinal-space split, forward-cursor preference, cross-version
  resolution, the compatibility and never-pay-twice-through-upgrade
  lemmas), and KeyDeriver contract tests against the frozen v2 golden
  identities including the docs/03 worked example. Fixture regeneration is
  deliberate: scripts/record-m2-cassettes.mjs rebuilds, and CI write
  protection (scripts/check-frozen-fixtures.mjs plus fixtures.sha256)
  fails any fixture diff shipped without the explicit bump token (the
  hyphenated compound of hashVersion and bump) in a changeset.

#### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

### 0.2.0

#### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

#### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0

## @rulvar/store-sqlite

### 1.44.0

#### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0

### 1.43.0

#### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

### 1.42.0

#### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

### 1.41.0

#### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

### 1.40.0

#### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

### 1.39.0

#### Patch Changes

- @rulvar/core@1.39.0

### 1.38.0

#### Patch Changes

- @rulvar/core@1.38.0

### 1.37.0

#### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

### 1.36.0

#### Minor Changes

- 101795b: Validate `SqliteStoreOptions.ttlMs` as an integer between 1 and 2147483647 ms BEFORE the database opens, and expose the configured value as the readonly `leaseTtlMs` capability (v1.35.0 review P2). Unvalidated, zero or a negative made every lease born expired so a second owner could take over immediately, NaN failed the first acquire with a raw sqlite error, and Infinity never expired.

#### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

### 1.35.0

#### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

### 1.34.0

#### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

### 1.33.0

#### Patch Changes

- @rulvar/core@1.33.0

### 1.32.0

#### Patch Changes

- @rulvar/core@1.32.0

### 1.31.0

#### Patch Changes

- @rulvar/core@1.31.0

### 1.30.0

#### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

### 1.29.0

#### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

### 1.28.0

#### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

### 1.27.0

#### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

### 1.26.0

#### Minor Changes

- a4fc757: `SqliteStore` implements the exact lookup capability (`getMeta` as a primary key query) and narrows `status`, `statuses`, and `name` in SQL over the JSON payload behind new expression indexes (created idempotently, so existing database files gain them on the next open), so a selective `listRuns` reads only the matching rows instead of decoding the whole catalog; the tags containment check stays in JS over the reduced set with unchanged semantics. The conformance kit checks the `genesis` round trip, that a `statuses` filter never drops a matching meta (supersets stay allowed), and that a store exposing `getMeta` agrees with `listRuns` and resolves `undefined` for a missing run. The planner's deterministic plan lookup reads one meta through the capability instead of scanning the catalog.

#### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

### 1.25.0

#### Patch Changes

- @rulvar/core@1.25.0

### 1.24.1

#### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

### 1.24.0

#### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

### 1.23.0

#### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

### 1.22.0

#### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

### 1.21.0

#### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

### 1.20.0

#### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

### 1.19.0

#### Patch Changes

- 8cc9a9c: Internal real-time reads bind the wall clock at module load, never the live global, eliminating false `RULVAR_BARE_DATE_NOW` warnings for consumers whose rulvar frames live outside `node_modules` (workspace dists, monorepo checkouts). Two composing defects: `createEngine` captured `Date.now` per call, so an engine created after a previous run had installed the dev-mode patch bound the PATCHED wrapper as its real clock (its `EventBus` then warned from the engine's own frames), and the ULID factory read the live global at every mint, so ids minted mid-run (the orchestrator extension IO, PlanRunner revisions, adapter id maps) routed through the patch too. The engine now uses a module-load `realNow` binding (module load always precedes the first patch install), the vendored ULID factory defaults to its own module-load clock, and `@rulvar/store-sqlite` follows the same convention. The dev-mode guard itself is untouched and stays exactly as sharp for workflow code, which keeps reading the live global.
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

### 1.18.0

#### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

### 1.17.0

#### Patch Changes

- @rulvar/core@1.17.0

### 1.16.2

#### Patch Changes

- @rulvar/core@1.16.2

### 1.16.1

#### Patch Changes

- @rulvar/core@1.16.1

### 1.16.0

#### Patch Changes

- @rulvar/core@1.16.0

### 1.15.0

#### Patch Changes

- @rulvar/core@1.15.0

### 1.14.0

#### Patch Changes

- @rulvar/core@1.14.0

### 1.13.0

#### Patch Changes

- @rulvar/core@1.13.0

### 1.12.0

#### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

### 1.11.0

#### Minor Changes

- 0c70c5e: Enforce the monotonic-seq store obligation: `append` commits through one atomic conditional INSERT that rejects an entry whose `seq` is not strictly greater than the run's stored tail with the typed `JournalOrderViolation`, so two writers racing the same journal from a stale tail can never both persist (the second writer of a split-brain resume gets a typed conflict instead of silently corrupting replay). Entries without a finite `seq` (legacy or exotic shapes) pass through unguarded, preserving payload opacity. A non-unique expression index over `(run_id, seq)` keeps the tail check cheap on long journals; existing database files need no migration.

#### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

### 1.10.0

#### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

### 1.9.0

#### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

### 1.8.0

#### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

### 1.7.0

#### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

### 1.6.0

#### Patch Changes

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

### 1.5.2

#### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

### 1.5.1

#### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

### 1.5.0

#### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

### 1.4.0

#### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

### 1.3.0

#### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

### 1.2.0

#### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

### 1.1.0

#### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

### 1.0.0

#### Patch Changes

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

### 0.9.0

#### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

### 0.8.0

#### Patch Changes

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

### 0.7.0

#### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

### 0.6.0

#### Minor Changes

- 8f7e61f: M5-T02 SqliteStore: the first real surface of @rulvar/store-sqlite.
  `SqliteStore` implements JournalStore AND LeasableStore with fencing
  epochs over the builtin node:sqlite driver (zero native dependencies;
  requires a Node.js line with node:sqlite unflagged, 22.13+/23.4+). It
  passes the full @rulvar/store-conformance suites: A1-A4 store
  obligations, meta separation, the golden fold fixture, the decide-once
  oracle, the abandon-derived skip, lease exclusivity (typed
  LeaseHeldError), monotonic fencing epochs with stale-append rejection
  and invisibility, release fencing, and wall-clock ttl expiry with the
  renew-at-ttl/3 cadence. The lease ttl defaults to the Appendix A interim
  reference for this store (60000 ms; the committed value is an M8
  decision), and an injectable clock supports expiry tests. This is the
  reference implementation for community stores (docs/03, section 12.6).

#### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

### 0.5.0

#### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

### 0.4.0

#### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

### 0.3.0

#### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

### 0.2.0

#### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

#### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0

## @rulvar/testing

### 1.44.0

#### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0

### 1.43.0

#### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

### 1.42.0

#### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

### 1.41.0

#### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

### 1.40.0

#### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

### 1.39.0

#### Patch Changes

- @rulvar/core@1.39.0

### 1.38.0

#### Patch Changes

- @rulvar/core@1.38.0

### 1.37.0

#### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

### 1.36.0

#### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

### 1.35.0

#### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

### 1.34.0

#### Minor Changes

- f1505ec: The VCR occurrence numbering is now bounded and the appending seed scales (v1.33.0 review P3). An appending `record()` session seeds each hash counter in one pass instead of spreading the whole group into `Math.max`, which overflowed the call stack with an untyped RangeError once a group held enough rows (150000 in the review's reproducer). A group that already numbers `Number.MAX_SAFE_INTEGER` refuses the appending session at construction, and a session whose counter would pass the ceiling refuses that call, both with a typed `ConfigError` naming the cassette, adapter, and hash, before dispatching the provider and before touching the file. Previously the recorder paid the provider, appended an unsafe number that a later `readCassette` refuses, and the stalled float counter then duplicated that same unsafe number on every following append, so the library itself turned a valid cassette invalid. The cassette format stays v1 with no new fields, `hashVersion` is untouched, and existing valid cassettes replay unchanged.

#### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

### 1.33.0

#### Minor Changes

- 3f0f5e8: Appending record sessions continue the occurrence numbering, and ambiguous numbering refuses (v1.32.0 review P2). Each `record()` call created a fresh occurrence counter, so a second session appending to an existing cassette restarted the numbering at zero for hashes the file already held: the file order stayed honest, but `replay`, which sorts a fully numbered group by its occurrence numbers, served the appended exchange before earlier ones (rows numbered 0, 1, 0 replayed as first, third, second). The error was silent, the cassette validated, and `onMiss: 'passthrough'` exists precisely to complete a cassette across sessions. `record()` now reads and validates an existing target before wrapping anything and seeds every `(adapterId, requestHash)` counter one past the highest number already on disk, so sequential sessions continue the numbering; a gap left by an aborted call stays a gap rather than being filled. Groups recorded before v1.32.0 keep their documented file order mode, including rows a later session appends to them. A duplicate occurrence inside a fully numbered group now refuses with a typed `ConfigError` naming the cassette, adapter, and hash, in `replay` and in an appending `record()` alike, because a duplicate means two recorder sessions wrote the file concurrently and either order would hand a caller the wrong exchange; the documented contract is one active recorder per cassette at a time, and a violation is now caught instead of silently misordering. Reading the target up front also closes two adjacent holes: `record()` no longer appends rows to a file that was never a cassette (or is empty), and it refuses a header recorded under a different `hashVersion`, which would have mixed two identity profiles under one header. The cassette format stays v1 and existing valid cassettes replay unchanged.

#### Patch Changes

- @rulvar/core@1.33.0

### 1.32.0

#### Minor Changes

- e366d64: Concurrent identical calls replay to the callers that made them (v1.31.0 review P2). `record` appends rows when each stream completes, so two identical live requests that finished out of order were stored in completion order, and `replay`, which hands occurrences out in caller order, served each caller the other one's response; a parallel workflow could branch differently on replay even though every hash and every row was valid. Every recorded `stream()` call now claims a zero based per `(adapterId, requestHash)` occurrence number synchronously in the call itself and persists it on the completed row, and `replay` serves same hash rows sorted by that number when every row of the group carries one. An aborted or failed call claims a number but appends no row, and such gaps are valid. The cassette format stays v1: readers before this release tolerate the new optional field and keep file order, and groups recorded before this release (no numbers) keep file order too. `readCassette` checks the field is a nonnegative safe integer when present.
- e366d64: Cassette event validation now covers every constrained nested field of the canonical vocabulary (v1.31.0 review P3). Three shapes the documentation already promised to refuse were accepted by `readCassette` and `replay`: a `tool-call-end` without its `args` (required payload; any JSON value including `null` is valid, absence is not, because the replayed event would differ from what the live adapter emitted), a refusal `stopDetails` that is not a plain object or whose present `type`, `category`, or `explanation` is not a string, and a finish `providerMetadata` that is not a plain object. All three now refuse with a typed `ConfigError` naming the JSONL line and the exact field path.
- e366d64: VCR passthrough now preserves truthful adapter provenance (v1.31.0 review P2). The engine journals every response served through a replay wrapper under the wrapper's own `provider` and `usageSemantics` declarations, and under `onMiss: 'passthrough'` that includes live served misses: before this release a miss served by the live adapter was journaled under the declarations of the recorded rows (a stale stamp asserting a semantics the serving adapter did not use), and a live adapter with no recorded rows lost both declarations entirely, so its journals went unstamped. `replay` now refuses at construction with a typed `ConfigError` when the cassette rows and the live passthrough adapter disagree on either declaration, absent versus present included, and an adapter with no recorded rows keeps the live adapter's own declarations, so wrapping stays metadata preserving. Under `onMiss: 'throw'` the live adapter only backs caps lookups and never serves, so no agreement is demanded there.

#### Patch Changes

- @rulvar/core@1.32.0

### 1.31.0

#### Minor Changes

- df6b8f8: `readCassette` now validates the nested structures of every row, not only field presence: the request must be a plain object (an array was accepted), every event must be a member of the canonical `ChatEvent` vocabulary with its required payload and the numeric Usage invariants (a null element used to crash replay with a raw `TypeError`, and a bare `{ type: 'finish' }` reached the engine and died there on the missing usage), and caps must carry every `ModelCaps` field, with the optional pricing table checked when present (an empty object passed as a snapshot). Failures throw a typed `ConfigError` naming the cassette path, the JSONL line, and the field path. Unknown extra fields stay tolerated for forward compatibility; an unknown event type is refused. Event stream semantics (exactly one trailing terminal per row) and adapter consistency across rows stay `replay` build concerns, so reading never blocks inspecting a well formed file.
- df6b8f8: VCR cassettes now carry the recording adapter's declared `usageSemantics`, and replay restores it. `record` snapshots the field into every row, `readCassette` requires a nonempty string when the field is present, and the adapter that `replay` rebuilds declares the recorded value, so the fresh journal of a replayed run gets the same provenance stamp the recorded run got. Before this, a replayed run's usage bearing entries were unstamped, which reads exactly like an entry recorded before the stamp existed; for an OpenAI journal with cache writes that unstamped shape is what the v1.19 cache audit treats as affected, so an honest replayed total could be "corrected" into a wrong number. All rows of one adapter must agree on `provider` and on `usageSemantics`; a conflict refuses with a typed `ConfigError` before anything is served. Cassettes recorded before this release store no `usageSemantics` and keep replaying, with nothing stamped (the documented legacy reading).

#### Patch Changes

- @rulvar/core@1.31.0

### 1.30.0

#### Minor Changes

- 87ce985: Replay repeated request hashes as ordered occurrences and validate the full cassette shape (v1.29.0 review P2 and P3). Published 1.29.0 built replay on a `Map<requestHash, row>`, so a cassette holding two exchanges under one hash (a recorded retry: error then success) served only the later row, on the first call and forever: the recorded error branch never replayed, usage and cost silently shrank, and no occurrence was ever exhausted. Rows sharing one `(adapterId, requestHash)` key now form an ordered occurrence list; every `stream()` call consumes exactly one occurrence in file order, claimed synchronously inside the call itself so concurrent identical requests each get their own exchange. A call past the last occurrence is a typed miss: `VcrMissError` gains a `recordedOccurrences` field saying the hash was recorded but is exhausted, and `onMiss: 'passthrough'` forwards exhausted hashes to the live adapter. `replay` also refuses a cassette whose row does not end with exactly one terminal event or whose caps snapshots conflict for one `(adapterId, model)`, and `readCassette` now validates the full documented header and row shape (integer `hashVersion`, date string `recordedAt`, nonempty `model`, a `request` object, a `caps` object, a string `provider` when present) with errors naming the cassette path and line; unknown extra fields stay tolerated for forward compatibility. Hand written cassettes missing documented fields, previously accepted and failed late with misleading errors, are now refused at read time; cassettes written by `record` always carried the full shape.

#### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

### 1.29.0

#### Minor Changes

- 621d566: A VCR cassette row is now always the record of one completed exchange, and `readCassette` validates the cassette format version (v1.28.0 review P2 and P3).

  `record` appends a row only when the wrapped stream delivered exactly one terminal event: a requested abort and a naturally truncated stream (no terminal), a thrown wire failure, and a contract violating stream (a second terminal or data after the terminal) append nothing. The v1.28.0 behavior that made the append unconditional on a clean generator exit could commit a partial, finish less exchange, which the fail closed core would then replay as a transport error; the intent of that fix is preserved, because a consumer that stops consuming right after the terminal (the engine shape) still commits its row.

  `readCassette` now refuses a cassette whose header does not declare format `v: 1` with a typed `ConfigError`, instead of silently interpreting an unknown future format as v1 (`hashVersion`, checked by replay, gates request identity and never substitutes for the format version). Corrupt JSON lines and rows missing their required fields also throw a typed `ConfigError` naming the cassette path and line, so a torn cassette fails loudly before any partial replay.

#### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

### 1.28.0

#### Minor Changes

- d98eb0b: Enforce the terminal stream contract end to end (v1.27.0 deep E2E review P1 and P2). The runtime now fails closed when an adapter stream drains without a terminal `finish` or `error` event: the partial turn becomes a retryable transport fault that feeds the ordinary retry and failover machinery instead of settling as `ok` with truncated text, and a requested abort (cancel, budget ceiling, idle severance) remains a clean end with no fabricated provider error. Consumption stops at the first terminal event, so events after `finish` can no longer mutate the value, revise the authoritative bill, or trigger tool execution. The first party adapters enforce the same contract at the wire: the Chat Completions mapper no longer synthesizes `finish: stop` when the stream is cut before a `finish_reason` (usage the provider did report is still forwarded, half assembled tool calls are dropped), the Responses mapper fails closed on EOF without a response terminal event, and the Anthropic adapter surfaces a read cut before `message_stop` as a retryable transport error and no longer converts a caller requested abort during `messages.create()` into a terminal error. `mapResponsesStream` and `mapChatCompletionsStream` accept an optional `signal` so a requested abort keeps ending the stream without a terminal event. The VCR `record` wrapper now commits its cassette row even when the consumer stops reading at the terminal event (the engine always does now); adapter middleware must not rely on being drained past the terminal. The committed `combined-loop-descent` catalog cassette is refrozen because stopping consumption at the terminal shifts the deterministic interleaving of two parallel plan children by one scheduler turn; entry content, keys, and the actual `hashVersion` are unchanged, journals recorded under earlier versions replay unchanged, and this changeset carries the frozen fixture gate's hashVersion-bump ceremony token only to unlock that refreeze.

#### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

### 1.27.0

#### Minor Changes

- 884a433: Types referenced by public signatures are now exported from their package barrels, so the API docs resolve them instead of carrying known incomplete references (v1.26.0 deep E2E review): `BaseAppend` from `@rulvar/core` (the fields common to every `Replayer` append), `Block` and `MappedStop` from `@rulvar/anthropic` (the wire level content block alias and the stop reason mapping), and `VcrHeader` from `@rulvar/testing` (the first line of every cassette file). The frozen TypeDoc baseline shrinks from eleven entries to the four vendored Standard Schema notices.

#### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

### 1.26.0

#### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

### 1.25.0

#### Patch Changes

- @rulvar/core@1.25.0

### 1.24.1

#### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

### 1.24.0

#### Minor Changes

- 2b033e8: Remove the repository-only cassette recording plumbing from the public root barrel (the v1.23.0 review): `buildFrozenV1JournalRaw`, `buildM2CassetteFixtures`, `buildV2GoldenIdentity`, `recordLiveCassettes`, and the M6 recording constants/helpers no longer appear in `dist/index.js` or `dist/index.d.ts`. They were `@internal` and absent from the API reference, yet importable and visible to every consumer's autocomplete, which read as public semver surface. They now live on an internal dist entry that the exports map never exposes; the monorepo's recorder scripts import it by file path. Per the documented versioning policy, `@internal` exports are outside the contract, so this rides a minor release. The supported tiers (FakeAdapter, createTestEngine, VCR, replay-strict, live smoke, matchers) are unchanged.

#### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

### 1.23.0

#### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

### 1.22.0

#### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

### 1.21.0

#### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

### 1.20.0

#### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

### 1.19.0

#### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

### 1.18.0

#### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

### 1.17.0

#### Patch Changes

- @rulvar/core@1.17.0

### 1.16.2

#### Patch Changes

- @rulvar/core@1.16.2

### 1.16.1

#### Patch Changes

- @rulvar/core@1.16.1

### 1.16.0

#### Minor Changes

- 5f76cf2: Cap `runLiveSmoke` backoffs at Node's timer maximum (v1.15 review P2-1). Both `baseDelayMs` and the largest scheduled backoff, `baseDelayMs * (attempts - 1)`, are now validated against the new exported `MAX_LIVE_SMOKE_DELAY_MS` (2^31 - 1 ms) before any stream opens; past that bound Node would not sleep longer, it would clamp the timer to 1 ms with a `TimeoutOverflowWarning` and retry almost immediately. Every option rejection now carries `field`, `value`, and `max` in the `ConfigError` `data`. Previously `baseDelayMs: 2_147_483_648` was accepted and silently turned the backoff into an immediate retry.

#### Patch Changes

- @rulvar/core@1.16.0

### 1.15.0

#### Minor Changes

- 4aee1f3: Harden `runLiveSmoke` (v1.14 review P2-1 and P3-1). Options are validated before any stream opens: `attempts` must be an integer from 1 to the new exported `MAX_LIVE_SMOKE_ATTEMPTS` (10) and `baseDelayMs` a non-negative integer; anything else, `NaN`, `Infinity`, and fractions included, rejects with a typed `ConfigError` instead of being clamped, defaulted, or (for `Infinity`) allowed to spend without bound. The provider SPI's terminal contract is now enforced per attempt: a stream with multiple terminal events, or whose single terminal is not the final event, classifies as the new `'contract-violation'` outcome (`reason: 'multiple-terminals' | 'terminal-not-final'`) and is never retried; `'no-terminal'` keeps meaning exactly zero terminals. Previously an `error` followed by a `finish` classified as `'ok'`, and explicit `attempts: 0` or fractional values were silently coerced. `DEFAULT_LIVE_SMOKE_ATTEMPTS` is also exported.

#### Patch Changes

- @rulvar/core@1.15.0

### 1.14.0

#### Minor Changes

- 6073226: Add the live-test opt-in gate and the bounded live smoke. `liveTestEnabled(...keys)` is true only when `RULVAR_LIVE_TESTS=1` AND every named environment key is present, so a provider key alone never triggers a paid call from an ordinary test run. `runLiveSmoke(adapter, req, options?)` drains one adapter stream per attempt and classifies the terminal event: `finish` passes, a typed retryable error (429 rate limit, 529 overload, transport) retries with linear backoff up to the attempt bound, a non-retryable error fails immediately with the typed `WireError` intact, a stream without any terminal event is reported as the adapter-contract violation it is, and a thrown stream propagates unchanged. Rulvar's own key-gated live suites (Anthropic, OpenAI, ai-sdk bridge, the umbrella example) now require the explicit opt-in and run via the documented `pnpm test:live` command, which reports which suites will fire and never prints key values.

#### Patch Changes

- @rulvar/core@1.14.0

### 1.13.0

#### Minor Changes

- c28c4c0: `FakeAdapter` honors the caller's `AbortSignal` under the same contract as live adapters (v1.12 follow-up review, P2). `stream` now accepts the optional `signal` every `ProviderAdapter` receives and obeys the adapter-authors abort rule: an abort ends the stream promptly with no terminal event and is never converted into a fake provider error. A request whose signal is already aborted on arrival is never served: no responder runs, nothing is recorded in `fake.calls`, no events are emitted. An abort while an async responder is pending detaches the responder (its late value is discarded and a late rejection cannot become an unhandled rejection) and ends the iterator without waiting it out; an abort during event emission stops at the next synchronous boundary. Cancellation, deadline, and budget tests over `createTestEngine` therefore observe the same journal shapes as production adapters: a cancelled run journals the agent as `cancelled`, never as a false `agent: ok` terminal. Non-aborted behavior (output events, usage, tool calls, structured-output tiers, call recording, deterministic ids) is unchanged.

#### Patch Changes

- @rulvar/core@1.13.0

### 1.12.0

#### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

### 1.11.0

#### Patch Changes

- 0c70c5e: Repair the committed `class-decision-fanout` cassette: the M9 live re-record was itself corrupted by the suspension split-brain fixed in this release (its recorder resolved `report-1` on the settled handle, waking the closed body while a resume appended concurrently), so the committed journal held two byte-identical `report-2` suspended entries with the same seq. Re-recording through the fixed engine drops exactly the duplicate twin; every other live cassette is byte-identical. This is NOT a hashVersion-bump and no identity profile changed; the literal ceremony token appears here only because the frozen-fixture lock refresh requires a changeset carrying it, and a corrupt-fixture repair is precisely the deliberate, reviewable diff the ceremony exists to force.
- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

### 1.10.0

#### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

### 1.9.0

#### Minor Changes

- 7577f8e: Correct the Anthropic fallback pricing to the official table and export versioned price tables from both first-party adapters.

  The `ANTHROPIC_MODELS` seed rows had never been audited against the published price list and overcharged every current Claude model: Fable 5 was seeded at exactly 2x the official rate (20/100 vs 10/50 per MTok, cache rates likewise), Opus 4.8 at 12/60 vs 5/25, Opus 4.7 at 10/50 vs 5/25, and Opus 4.6 at 15/75 vs 5/25. Claude Sonnet 5 now carries its introductory price (2/10, in effect through 2026-08-31); Haiku 4.5 and Sonnet 4.6 were already correct. Cost reports for affected models drop accordingly, and budget ceilings admit roughly twice the work they previously rejected.

  New exports `ANTHROPIC_PRICING` (`anthropic-2026-07-16`) and `OPENAI_PRICING` (`openai-2026-07-16`) publish the seed rows as versioned `PriceTable`s for `createEngine({ pricing })`, so runs journal a concrete pricing version instead of `unpriced` and price revisions become explicit table updates. `createTestEngine` gained a `pricing` passthrough for testing against a versioned table.

#### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

### 1.8.0

#### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

### 1.7.0

#### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

### 1.6.0

#### Patch Changes

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

### 1.5.2

#### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

### 1.5.1

#### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

### 1.5.0

#### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

### 1.4.0

#### Minor Changes

- c4f563d: Production readiness fixes from the July 2026 full audit.

  - The `budgetUsd` ceiling now survives resume: the engine records it in `RunMeta.budgetUsd` and restores it on every resume, so the replayed spend counts against the original invocation's bound and `ResumeOptions` still exposes no way to raise it. Journals written before the field existed (or read through a store that drops optional `RunMeta` fields) resume uncapped, exactly as before; the conformance kit gains a round-trip check so custom stores cannot drop the field silently.
  - `spawn:rejected` and `resolution:applied` / `resolution:superseded` are now emitted: live admission rejections carry the rejection `code`, `agentType`, and the journaled decision `entryRef` (absent only for pre-admission config gates), and live resolution attempts report winning or losing the first-closing-wins fold. `spawn:admitted` now carries the decision `entryRef` and the admitting `verdict` arm. The `orchestrator:budget` union member now types the two payload shapes actually emitted; `journal:compat` stays declared but unemitted (the scan runs before a run's event stream exists) and its TSDoc says so.
  - `toOtel` implements real parent-child span nesting when `contextApi` and `setSpan` are passed; without them spans stay flat but attributed.

  - `'readonly'` isolation now compiles a deny rule for tools declaring risk `write` or `destructive` into the spawn's permission chain, exactly as the tools guide documents; read tools and other isolation modes are unaffected.
  - VCR `replay()` refuses a cassette recorded outside the engine's hashVersion support window (`[CURRENT-1, CURRENT]`) with a typed `ConfigError` instead of silently drifting; in-window cassettes replay as before.
  - `InMemoryStore` accepts `{ quiet: true }` to opt out of the durability warning, and the warning text now states the precise truth: nothing survives a process exit and cross-process resume is impossible (same-process resume of a kept instance works). `createTestEngine` constructs its store quietly, so the blessed offline tier no longer prints a misleading warning.
  - The bare `Date.now()` / `Math.random()` development warnings no longer blame workflow code for calls that originate in library internals (the engine's own retry jitter, provider SDKs): the retry jitter uses a natively captured `Math.random`, and the in-process guard skips callers that live under `node_modules`.
  - `rulvar run --profile` now applies the profile's per-role effort hints: entries in `defaults.routing` that carry no effort are seeded from `RunProfile.effortByRole` (an explicit host effort always wins; ladder entries and unrouted roles stay untouched).
  - `rulvar --help` documents the shipped `kb inbox` and `kb gate` subcommands.
  - The unscoped `rulvar` pointer package ships TypeScript declarations (`index.d.ts` with a `types` export condition), so strict TypeScript projects can import the bare name; the install smoke gate now packs and checks the pointer alongside the umbrella.

#### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

### 1.3.2

#### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

### 1.3.1

#### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

### 1.3.0

#### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

### 1.2.0

#### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

### 1.1.0

#### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

### 1.0.0

#### Minor Changes

- 807d1f9: M9-T04 (final part): the DEF-4 live re-record, production-journal replay, and the one-CI-job catalog gate (docs/09 section 6; docs/10 M9 row "Complete catalog green in one CI run"; the 1.0 gate of docs/12 section 5).

  - The six DEF-4 cassettes are re-recorded through the LIVE producers per the synthetic-fixture rule: engine runs, RunHandle.resolveExternal, and the offline kernel writer (the M8 machinery) produce the committed journals; recordLiveCassettes gains the six recorders and scripts/record-m3-cassettes.mjs regenerates them. The synthetic builders stay in the suite as the kernel regression (def1-def4.test.ts now replays the builder output for DEF-4), and the new def4-live.test.ts replays the committed live forms end-to-end, seq-agnostic.
  - Production-journal replay is wired: dogfood journals live under the frozen `journals/` directory and every one replays STRICT with zero live calls against its shipped workflow (examples/src/journals.test.ts; RECORD_DOGFOOD=1 re-records). Seeded with judge-panel-fake, a full run of the shipped judge-panel example.
  - The catalog gates as ONE CI job: `cassette-catalog` runs scripts/catalog-audit.mjs (every docs/09 section 6 ID must resolve to a cassettes/ fixture or a named suite; 58 IDs today, parser-drift guarded) and then a single vitest invocation over every cassette suite (the M2/M3/M9 fixture suites, the M7/M8/M9 plan cassettes, the M8 multi-process soak, and the dogfood journals), replay-strict with zero live calls.

#### Patch Changes

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

### 0.9.0

#### Minor Changes

- 65c7b2c: M8-T01: createServer, the HTTP shell (docs/02 section 8.2; FR-702), plus the Engine.stores seam it stands on (docs/06 10.2, M8 entry amendment).

  - `@rulvar/cli`: `createServer({ engine, workflows })` returns `{ fetch(req: Request): Promise<Response> }` with the five canonical routes: POST /runs (start a registered workflow), GET /runs/:id (status and outcome), GET /runs/:id/events (SSE; Last-Event-ID maps to the event seq, replay is at-least-once and consumers deduplicate on `replayed`), POST /runs/:id/external/:key (programmatic resolution, `by: 'external'`; a run that settled suspended in-process auto-resumes; a run not live in this process gets the documented offline append under a lease where the store is leasable, and resumes on a worker), GET /runs/:id/cost (the settled in-process CostReport, or the pure journal fold priced by the optional `priceUsd`). Authentication stays host middleware (docs/14, OQ-16).
  - `@rulvar/core`: the Engine interface gains the readonly `stores` accessor exposing the configured journal and transcript stores; exactly the instances createEngine received (or defaulted), no store contract widens.
  - `@rulvar/testing`: `createTestEngine` forwards the new `stores` accessor.

- ebc8101: M8-T04: the redaction and retention interim rules executed (docs/14 OQ-20 and OQ-22; docs/09 section 8 rewritten to the executed state; docs/03 12.4 and 12.8; docs/06 10.1 and 10.2 amendments).

  - `@rulvar/core`: the L0 SerializationHook (`createEngine({ serialization })`): redact/encrypt at the append/put boundaries, symmetric on load/get, applied by wrapping the stores so `Engine.stores` exposes the one policy point; kernel ordering fields are drift-checked with a loud ConfigError. Default key masking at the telemetry boundary: every emitted WorkflowEvent passes `maskSecrets` (provider keys, PATs, bearer tokens, JWTs, private-key blocks become `[masked-secret]`); opt out via `redaction: { maskEvents: false }`; never touches the journal. Retention: `TranscriptStore.delete(ref)` joins the SPI (missing ref is a no-op; InMemory and File stores implement it), `Engine.deleteRun(runId)` cascades blob deletion before the journal (no orphan transcripts), and `Engine.pruneRun(runId)` deletes checkpoint blobs of ok-terminal attempts that nothing else references (parked, cancelled, escalated, and hanging attempts keep theirs).
  - `@rulvar/cli`: `createServer` and `createWorker` take the opt-in `retention` predicate over RunMeta (the server applies it at terminal settles, the worker during sweeps under a brief lease); the OTel exporter masks string span attributes with the same policy, defense in depth over the already conservative attribute content policy.
  - `@rulvar/testing`: `createTestEngine` forwards `deleteRun`/`pruneRun`.

#### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

### 0.8.0

#### Patch Changes

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

### 0.7.0

#### Minor Changes

- 10b45f1: M6-T11: the rulvar plan command and the M6 gating cassettes. `rulvar plan "<goal>" [--dry-run]` (the canonical grammar) loads @rulvar/planner DYNAMICALLY (the CLI's static dependency stays @rulvar/core; a missing install is a clear error), plans against the host-config engine, prints the accepted script plus its advisory diagnostics, and runs it in the worker sandbox unless --dry-run. The three docs/09 6.10 gating cassettes are recorded on the FakeAdapter and committed under the frozen-fixture lock with exported scenario builders shared by the recorder script and the replay tests: sandbox-determinism (two fresh runs of one CompiledWorkflow produce byte-identical normalized journals matching the cassette), planner-self-repair (the failing draft round-trips through the JSON-diagnostics repair, re-planning from the committed journal is free, and the accepted script executes deterministically in the sandbox), and orchestrator-crash-resume (the committed pre-crash journal plus boundary checkpoints resume with zero re-paid spawns, no duplicate spawn decisions, and byte-stable handles).

#### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

### 0.6.0

#### Minor Changes

- 638d9a1: M5-T04 VCR cassettes and cron contract tests. `@rulvar/testing` gains
  the tier-2 VCR at the adapter boundary: `record({ adapters, cassette,
redact? })` wraps live adapters and appends redacted JSONL rows keyed by
  a hash of the canonical wire-contract request (the engine-populated
  providerOptions.rulvar telemetry namespace is excluded from the key);
  `replay({ cassette, onMiss })` serves recorded streams back with the
  typed VcrMissError under 'throw' (hermetic CI) or live forwarding under
  'passthrough'. Redaction happens at record time: the built-in policy
  masks authorization material (key-shaped strings, bearer tokens,
  api-key assignments) in every stored string and a custom hook composes
  on top, so secrets never reach cassette bytes. Cassette headers record
  the hashVersion they were produced under (DEF-6), and replay adapters
  expose the recorded caps snapshots. The live contract-test cron
  workflow is now real: weekly, non-blocking, gated on the
  CONTRACT_TESTS_ENABLED variable and provider keys, validating the wire
  contract (one terminal event, Usage invariant, finish vocabulary)
  against committed provider cassettes and opening a contract-drift issue
  on failure instead of rerecording.

#### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

### 0.5.0

#### Minor Changes

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

- b840aba: M4-T08 canonical effort completion and M4-T09 role quality floors.

  - Effort semantics are complete: the role effort defaults and the
    per-adapter mapping tables (Anthropic passthrough including max,
    OpenAI max downmapped to xhigh and recorded in providerMetadata,
    provider none only via namespaced providerOptions) shipped earlier
    milestones; this change completes VISIBLE scrubbing everywhere it was
    still silent: the summarize invocation surfaces its scrubs at fire
    time and a failover takeover surfaces the fallback's scrubs the
    moment it starts serving. Scrubbed effort is never mapped into
    max_tokens.
  - The effort-defaults-shift cassette is now RECORDED through the live
    runtime (docs/10 M4 gating row): the frozen v1 prefix, closed offline
    the way an operator would, resumes live under explicit high effort
    with the completed semantics; every v1 entry matches and the one new
    spawn carries canonical effort in v2 identity. The recorder output is
    pinned byte-for-byte by the frozen-drift suite and the fixture lock
    now covers 18 files.
  - Quality floors (`model/floors.ts`, M4-T09): per-role and
    per-declared-taskClass allow/deny lists supplied via
    `createEngine({ floors })`, enforced INSIDE the router at resolution,
    before any live call and before any journal entry, for every
    invocation the chain produces (primaries, failover fallbacks, and the
    summarize fallback alike). `AgentProfile.taskClass` declares the
    class; unclassified profiles see only byRole floors. A violation is a
    typed ConfigError.
  - The umbrella `rulvar` package now ships floors opinions next to its
    strong routing defaults: `recommendedDefaults.floors` pins orchestrate
    and plan to strong named models. The core itself ships no named model
    strings, and the umbrella suite enforces that with a source scan.

#### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

### 0.4.0

#### Minor Changes

- dfe03b5: M3-T11 gating cassettes and the v0.4.0 BREAKING release notes.

  BREAKING (pre-1.0 convention, docs/12): `AgentStatus` now produces
  `'escalated'` at runtime and `AgentResult` carries the optional
  `escalation: EscalationReport` field (present if and only if the status
  is escalated). This is the third kernel amendment of the replay
  predicate (escalated-replays-as-ok, DEF-1) whose table row shipped
  frozen in M2; the producers ship here. Migration: add an `escalated`
  branch to every switch over `AgentStatus`; consumers not adopting the
  protocol are advised to map `escalated` to `limit` (paid partial work,
  output null, the report stays available for logs). `isEscalated` and
  `EscalatedResult` are exported for narrowing. Status production stays
  gated by opt-in: workflows that never pass `escalation` options cannot
  observe the new status at runtime.

  Cassettes: the DEF-1 live set (escalate-replay,
  crash-between-report-and-decision, flavor-b-timeout) is recorded through
  the live runtime and replayed strict; the M2 synthetic DEF-1 subset is
  re-recorded (memoize-classifier fully live; abandon-subtree through the
  kernel write APIs with a realistic escalated child report and an
  authorizing owner cancel decision; both re-record again with the
  orchestrator producers in M7). FakeAdapter gains fakeToolCalls and
  fakeWireError responder markers; replayRun gains the onEscalation
  pass-through so replay tests can prove the hook stays cold. The
  deliberate fixture regeneration updates fixtures.sha256 in the same
  change (the identity profile is UNCHANGED; this is the docs/10 M3-T11
  ordered re-record, not an identity-pipeline revision).

#### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

### 0.3.0

#### Minor Changes

- 43444f6: M2-T11/T12: the executable store conformance kit and the M2 gating
  cassettes with frozen fixtures.

  @rulvar/store-conformance ships its first real API: journalStoreConformance
  (A1 append atomicity, A2 total per-run order, A3 read-your-writes, A4
  opaque payload with read-side-only normalization, meta separation, the
  golden fold-state fixture with a frozen reference hash, the decide-once
  oracle, and the abandon-derived-skip fixture) and leasableStoreConformance
  (typed LeaseHeldError on held acquire, monotonic fencing epochs,
  stale-epoch appends rejected and invisible, released leases fenced from
  renew and append, optional ttl/renew-cadence timing checks), plus
  registerConformance for Vitest/Jest and the stableStringify fold-state
  hasher. InMemoryStore and JsonlFileStore pass; deliberately broken stores
  (reordering, normalizing, tearing, fencing-less) fail loudly.

  @rulvar/core kernel closes three DEF-1/DEF-4 gaps the cassettes gate: an
  abandon-covered hanging dispatch derives skipped instead of redispatching,
  abandon-covered operations contribute a zero ledger increment, the resume
  report lists covered entries as skipped (never orphaned), and an abandon
  over an already-resolved suspension folds to a noop with already_resolved
  (first-closing-wins per target, both closer kinds).

  @rulvar/testing ships the M2 cassette suite over committed frozen
  fixtures: the DEF-1 synthetic subset (abandon-subtree, memoize-classifier,
  v1-journal-on-v2), the DEF-4 set (timeout-vs-live-race,
  class-decision-fanout, abandon-then-crash-then-resume,
  abandon-vs-resolution-race, offline-invalid-then-valid,
  double-abandon-idempotent), the DEF-6 six IDs (resume-v1-on-engine-v2,
  resume-v1-with-inserted-call, suspended-v1-resolves-on-v2,
  reject-version-too-old via deriverV0Synthetic, reject-version-from-future,
  effort-defaults-shift), the mandatory mixed-version scenarios
  (ordinal-space split, forward-cursor preference, cross-version
  resolution, the compatibility and never-pay-twice-through-upgrade
  lemmas), and KeyDeriver contract tests against the frozen v2 golden
  identities including the docs/03 worked example. Fixture regeneration is
  deliberate: scripts/record-m2-cassettes.mjs rebuilds, and CI write
  protection (scripts/check-frozen-fixtures.mjs plus fixtures.sha256)
  fails any fixture diff shipped without the explicit bump token (the
  hyphenated compound of hashVersion and bump) in a changeset.

- a1b35d3: M2-T09/T10: engine.resume under the run-to-definition binding contract
  (wf required for in-process runs, name mismatch is a typed ConfigError,
  body-hash mismatch warns loudly and proceeds; the compatibility scan
  runs strictly before any side effect; the resumed run seeds the budget
  from the ledger fold, re-emits open suspensions, and reports
  ResumePreview hits/misses/reruns/orphans plus invalid offline
  resolutions), the dryRun option (replay-strict matching: the first
  would-be-live call settles the run with the typed journal_miss error and
  zero live calls), and @rulvar/testing replayRun (tier 3: strict replay
  of any journal with JournalMissError on ANY live call; suspended
  journals finish suspended with zero live calls).

#### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

### 0.2.0

#### Minor Changes

- 5c4fc32: M1-T14/T15: @rulvar/testing tier 1 (FakeAdapter matching on
  agentType/label/prompt regex with a '*' fallback, honoring the selected
  structured-output tier, zero USD by construction; createTestEngine over
  the full real engine with recorded event streams; toHaveCalledAgent and
  toStayUnderBudget matchers at '@rulvar/testing/matchers') and the
  completed umbrella (re-exports of @rulvar/core and both first-class
  adapters, renderProgress, the umbrella-only recommendedDefaults strong
  model slots, the M1 exit-criteria example workflow, and the CI install
  smoke on packed tarballs). The core now populates the reserved
  providerOptions 'rulvar' telemetry namespace on every request (docs/04
  section 1.8 as amended) and AgentResult carries errorMessage detail for
  journaled WireError fidelity.

#### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

### 0.1.0

#### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

#### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0
