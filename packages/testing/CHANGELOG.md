# @rulvar/testing

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

### Minor Changes

- f1505ec: The VCR occurrence numbering is now bounded and the appending seed scales (v1.33.0 review P3). An appending `record()` session seeds each hash counter in one pass instead of spreading the whole group into `Math.max`, which overflowed the call stack with an untyped RangeError once a group held enough rows (150000 in the review's reproducer). A group that already numbers `Number.MAX_SAFE_INTEGER` refuses the appending session at construction, and a session whose counter would pass the ceiling refuses that call, both with a typed `ConfigError` naming the cassette, adapter, and hash, before dispatching the provider and before touching the file. Previously the recorder paid the provider, appended an unsafe number that a later `readCassette` refuses, and the stalled float counter then duplicated that same unsafe number on every following append, so the library itself turned a valid cassette invalid. The cassette format stays v1 with no new fields, `hashVersion` is untouched, and existing valid cassettes replay unchanged.

### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

## 1.33.0

### Minor Changes

- 3f0f5e8: Appending record sessions continue the occurrence numbering, and ambiguous numbering refuses (v1.32.0 review P2). Each `record()` call created a fresh occurrence counter, so a second session appending to an existing cassette restarted the numbering at zero for hashes the file already held: the file order stayed honest, but `replay`, which sorts a fully numbered group by its occurrence numbers, served the appended exchange before earlier ones (rows numbered 0, 1, 0 replayed as first, third, second). The error was silent, the cassette validated, and `onMiss: 'passthrough'` exists precisely to complete a cassette across sessions. `record()` now reads and validates an existing target before wrapping anything and seeds every `(adapterId, requestHash)` counter one past the highest number already on disk, so sequential sessions continue the numbering; a gap left by an aborted call stays a gap rather than being filled. Groups recorded before v1.32.0 keep their documented file order mode, including rows a later session appends to them. A duplicate occurrence inside a fully numbered group now refuses with a typed `ConfigError` naming the cassette, adapter, and hash, in `replay` and in an appending `record()` alike, because a duplicate means two recorder sessions wrote the file concurrently and either order would hand a caller the wrong exchange; the documented contract is one active recorder per cassette at a time, and a violation is now caught instead of silently misordering. Reading the target up front also closes two adjacent holes: `record()` no longer appends rows to a file that was never a cassette (or is empty), and it refuses a header recorded under a different `hashVersion`, which would have mixed two identity profiles under one header. The cassette format stays v1 and existing valid cassettes replay unchanged.

### Patch Changes

- @rulvar/core@1.33.0

## 1.32.0

### Minor Changes

- e366d64: Concurrent identical calls replay to the callers that made them (v1.31.0 review P2). `record` appends rows when each stream completes, so two identical live requests that finished out of order were stored in completion order, and `replay`, which hands occurrences out in caller order, served each caller the other one's response; a parallel workflow could branch differently on replay even though every hash and every row was valid. Every recorded `stream()` call now claims a zero based per `(adapterId, requestHash)` occurrence number synchronously in the call itself and persists it on the completed row, and `replay` serves same hash rows sorted by that number when every row of the group carries one. An aborted or failed call claims a number but appends no row, and such gaps are valid. The cassette format stays v1: readers before this release tolerate the new optional field and keep file order, and groups recorded before this release (no numbers) keep file order too. `readCassette` checks the field is a nonnegative safe integer when present.
- e366d64: Cassette event validation now covers every constrained nested field of the canonical vocabulary (v1.31.0 review P3). Three shapes the documentation already promised to refuse were accepted by `readCassette` and `replay`: a `tool-call-end` without its `args` (required payload; any JSON value including `null` is valid, absence is not, because the replayed event would differ from what the live adapter emitted), a refusal `stopDetails` that is not a plain object or whose present `type`, `category`, or `explanation` is not a string, and a finish `providerMetadata` that is not a plain object. All three now refuse with a typed `ConfigError` naming the JSONL line and the exact field path.
- e366d64: VCR passthrough now preserves truthful adapter provenance (v1.31.0 review P2). The engine journals every response served through a replay wrapper under the wrapper's own `provider` and `usageSemantics` declarations, and under `onMiss: 'passthrough'` that includes live served misses: before this release a miss served by the live adapter was journaled under the declarations of the recorded rows (a stale stamp asserting a semantics the serving adapter did not use), and a live adapter with no recorded rows lost both declarations entirely, so its journals went unstamped. `replay` now refuses at construction with a typed `ConfigError` when the cassette rows and the live passthrough adapter disagree on either declaration, absent versus present included, and an adapter with no recorded rows keeps the live adapter's own declarations, so wrapping stays metadata preserving. Under `onMiss: 'throw'` the live adapter only backs caps lookups and never serves, so no agreement is demanded there.

### Patch Changes

- @rulvar/core@1.32.0

## 1.31.0

### Minor Changes

- df6b8f8: `readCassette` now validates the nested structures of every row, not only field presence: the request must be a plain object (an array was accepted), every event must be a member of the canonical `ChatEvent` vocabulary with its required payload and the numeric Usage invariants (a null element used to crash replay with a raw `TypeError`, and a bare `{ type: 'finish' }` reached the engine and died there on the missing usage), and caps must carry every `ModelCaps` field, with the optional pricing table checked when present (an empty object passed as a snapshot). Failures throw a typed `ConfigError` naming the cassette path, the JSONL line, and the field path. Unknown extra fields stay tolerated for forward compatibility; an unknown event type is refused. Event stream semantics (exactly one trailing terminal per row) and adapter consistency across rows stay `replay` build concerns, so reading never blocks inspecting a well formed file.
- df6b8f8: VCR cassettes now carry the recording adapter's declared `usageSemantics`, and replay restores it. `record` snapshots the field into every row, `readCassette` requires a nonempty string when the field is present, and the adapter that `replay` rebuilds declares the recorded value, so the fresh journal of a replayed run gets the same provenance stamp the recorded run got. Before this, a replayed run's usage bearing entries were unstamped, which reads exactly like an entry recorded before the stamp existed; for an OpenAI journal with cache writes that unstamped shape is what the v1.19 cache audit treats as affected, so an honest replayed total could be "corrected" into a wrong number. All rows of one adapter must agree on `provider` and on `usageSemantics`; a conflict refuses with a typed `ConfigError` before anything is served. Cassettes recorded before this release store no `usageSemantics` and keep replaying, with nothing stamped (the documented legacy reading).

### Patch Changes

- @rulvar/core@1.31.0

## 1.30.0

### Minor Changes

- 87ce985: Replay repeated request hashes as ordered occurrences and validate the full cassette shape (v1.29.0 review P2 and P3). Published 1.29.0 built replay on a `Map<requestHash, row>`, so a cassette holding two exchanges under one hash (a recorded retry: error then success) served only the later row, on the first call and forever: the recorded error branch never replayed, usage and cost silently shrank, and no occurrence was ever exhausted. Rows sharing one `(adapterId, requestHash)` key now form an ordered occurrence list; every `stream()` call consumes exactly one occurrence in file order, claimed synchronously inside the call itself so concurrent identical requests each get their own exchange. A call past the last occurrence is a typed miss: `VcrMissError` gains a `recordedOccurrences` field saying the hash was recorded but is exhausted, and `onMiss: 'passthrough'` forwards exhausted hashes to the live adapter. `replay` also refuses a cassette whose row does not end with exactly one terminal event or whose caps snapshots conflict for one `(adapterId, model)`, and `readCassette` now validates the full documented header and row shape (integer `hashVersion`, date string `recordedAt`, nonempty `model`, a `request` object, a `caps` object, a string `provider` when present) with errors naming the cassette path and line; unknown extra fields stay tolerated for forward compatibility. Hand written cassettes missing documented fields, previously accepted and failed late with misleading errors, are now refused at read time; cassettes written by `record` always carried the full shape.

### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

## 1.29.0

### Minor Changes

- 621d566: A VCR cassette row is now always the record of one completed exchange, and `readCassette` validates the cassette format version (v1.28.0 review P2 and P3).

  `record` appends a row only when the wrapped stream delivered exactly one terminal event: a requested abort and a naturally truncated stream (no terminal), a thrown wire failure, and a contract violating stream (a second terminal or data after the terminal) append nothing. The v1.28.0 behavior that made the append unconditional on a clean generator exit could commit a partial, finish less exchange, which the fail closed core would then replay as a transport error; the intent of that fix is preserved, because a consumer that stops consuming right after the terminal (the engine shape) still commits its row.

  `readCassette` now refuses a cassette whose header does not declare format `v: 1` with a typed `ConfigError`, instead of silently interpreting an unknown future format as v1 (`hashVersion`, checked by replay, gates request identity and never substitutes for the format version). Corrupt JSON lines and rows missing their required fields also throw a typed `ConfigError` naming the cassette path and line, so a torn cassette fails loudly before any partial replay.

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

### Minor Changes

- 2b033e8: Remove the repository-only cassette recording plumbing from the public root barrel (the v1.23.0 review): `buildFrozenV1JournalRaw`, `buildM2CassetteFixtures`, `buildV2GoldenIdentity`, `recordLiveCassettes`, and the M6 recording constants/helpers no longer appear in `dist/index.js` or `dist/index.d.ts`. They were `@internal` and absent from the API reference, yet importable and visible to every consumer's autocomplete, which read as public semver surface. They now live on an internal dist entry that the exports map never exposes; the monorepo's recorder scripts import it by file path. Per the documented versioning policy, `@internal` exports are outside the contract, so this rides a minor release. The supported tiers (FakeAdapter, createTestEngine, VCR, replay-strict, live smoke, matchers) are unchanged.

### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

## 1.23.0

### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

## 1.22.0

### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

## 1.21.0

### Patch Changes

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

- @rulvar/core@1.16.2

## 1.16.1

### Patch Changes

- @rulvar/core@1.16.1

## 1.16.0

### Minor Changes

- 5f76cf2: Cap `runLiveSmoke` backoffs at Node's timer maximum (v1.15 review P2-1). Both `baseDelayMs` and the largest scheduled backoff, `baseDelayMs * (attempts - 1)`, are now validated against the new exported `MAX_LIVE_SMOKE_DELAY_MS` (2^31 - 1 ms) before any stream opens; past that bound Node would not sleep longer, it would clamp the timer to 1 ms with a `TimeoutOverflowWarning` and retry almost immediately. Every option rejection now carries `field`, `value`, and `max` in the `ConfigError` `data`. Previously `baseDelayMs: 2_147_483_648` was accepted and silently turned the backoff into an immediate retry.

### Patch Changes

- @rulvar/core@1.16.0

## 1.15.0

### Minor Changes

- 4aee1f3: Harden `runLiveSmoke` (v1.14 review P2-1 and P3-1). Options are validated before any stream opens: `attempts` must be an integer from 1 to the new exported `MAX_LIVE_SMOKE_ATTEMPTS` (10) and `baseDelayMs` a non-negative integer; anything else, `NaN`, `Infinity`, and fractions included, rejects with a typed `ConfigError` instead of being clamped, defaulted, or (for `Infinity`) allowed to spend without bound. The provider SPI's terminal contract is now enforced per attempt: a stream with multiple terminal events, or whose single terminal is not the final event, classifies as the new `'contract-violation'` outcome (`reason: 'multiple-terminals' | 'terminal-not-final'`) and is never retried; `'no-terminal'` keeps meaning exactly zero terminals. Previously an `error` followed by a `finish` classified as `'ok'`, and explicit `attempts: 0` or fractional values were silently coerced. `DEFAULT_LIVE_SMOKE_ATTEMPTS` is also exported.

### Patch Changes

- @rulvar/core@1.15.0

## 1.14.0

### Minor Changes

- 6073226: Add the live-test opt-in gate and the bounded live smoke. `liveTestEnabled(...keys)` is true only when `RULVAR_LIVE_TESTS=1` AND every named environment key is present, so a provider key alone never triggers a paid call from an ordinary test run. `runLiveSmoke(adapter, req, options?)` drains one adapter stream per attempt and classifies the terminal event: `finish` passes, a typed retryable error (429 rate limit, 529 overload, transport) retries with linear backoff up to the attempt bound, a non-retryable error fails immediately with the typed `WireError` intact, a stream without any terminal event is reported as the adapter-contract violation it is, and a thrown stream propagates unchanged. Rulvar's own key-gated live suites (Anthropic, OpenAI, ai-sdk bridge, the umbrella example) now require the explicit opt-in and run via the documented `pnpm test:live` command, which reports which suites will fire and never prints key values.

### Patch Changes

- @rulvar/core@1.14.0

## 1.13.0

### Minor Changes

- c28c4c0: `FakeAdapter` honors the caller's `AbortSignal` under the same contract as live adapters (v1.12 follow-up review, P2). `stream` now accepts the optional `signal` every `ProviderAdapter` receives and obeys the adapter-authors abort rule: an abort ends the stream promptly with no terminal event and is never converted into a fake provider error. A request whose signal is already aborted on arrival is never served: no responder runs, nothing is recorded in `fake.calls`, no events are emitted. An abort while an async responder is pending detaches the responder (its late value is discarded and a late rejection cannot become an unhandled rejection) and ends the iterator without waiting it out; an abort during event emission stops at the next synchronous boundary. Cancellation, deadline, and budget tests over `createTestEngine` therefore observe the same journal shapes as production adapters: a cancelled run journals the agent as `cancelled`, never as a false `agent: ok` terminal. Non-aborted behavior (output events, usage, tool calls, structured-output tiers, call recording, deterministic ids) is unchanged.

### Patch Changes

- @rulvar/core@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

## 1.11.0

### Patch Changes

- 0c70c5e: Repair the committed `class-decision-fanout` cassette: the M9 live re-record was itself corrupted by the suspension split-brain fixed in this release (its recorder resolved `report-1` on the settled handle, waking the closed body while a resume appended concurrently), so the committed journal held two byte-identical `report-2` suspended entries with the same seq. Re-recording through the fixed engine drops exactly the duplicate twin; every other live cassette is byte-identical. This is NOT a hashVersion-bump and no identity profile changed; the literal ceremony token appears here only because the frozen-fixture lock refresh requires a changeset carrying it, and a corrupt-fixture repair is precisely the deliberate, reviewable diff the ceremony exists to force.
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

### Minor Changes

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

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

## 1.0.0

### Minor Changes

- 807d1f9: M9-T04 (final part): the DEF-4 live re-record, production-journal replay, and the one-CI-job catalog gate (docs/09 section 6; docs/10 M9 row "Complete catalog green in one CI run"; the 1.0 gate of docs/12 section 5).

  - The six DEF-4 cassettes are re-recorded through the LIVE producers per the synthetic-fixture rule: engine runs, RunHandle.resolveExternal, and the offline kernel writer (the M8 machinery) produce the committed journals; recordLiveCassettes gains the six recorders and scripts/record-m3-cassettes.mjs regenerates them. The synthetic builders stay in the suite as the kernel regression (def1-def4.test.ts now replays the builder output for DEF-4), and the new def4-live.test.ts replays the committed live forms end-to-end, seq-agnostic.
  - Production-journal replay is wired: dogfood journals live under the frozen `journals/` directory and every one replays STRICT with zero live calls against its shipped workflow (examples/src/journals.test.ts; RECORD_DOGFOOD=1 re-records). Seeded with judge-panel-fake, a full run of the shipped judge-panel example.
  - The catalog gates as ONE CI job: `cassette-catalog` runs scripts/catalog-audit.mjs (every docs/09 section 6 ID must resolve to a cassettes/ fixture or a named suite; 58 IDs today, parser-drift guarded) and then a single vitest invocation over every cassette suite (the M2/M3/M9 fixture suites, the M7/M8/M9 plan cassettes, the M8 multi-process soak, and the dogfood journals), replay-strict with zero live calls.

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

### Minor Changes

- 65c7b2c: M8-T01: createServer, the HTTP shell (docs/02 section 8.2; FR-702), plus the Engine.stores seam it stands on (docs/06 10.2, M8 entry amendment).

  - `@rulvar/cli`: `createServer({ engine, workflows })` returns `{ fetch(req: Request): Promise<Response> }` with the five canonical routes: POST /runs (start a registered workflow), GET /runs/:id (status and outcome), GET /runs/:id/events (SSE; Last-Event-ID maps to the event seq, replay is at-least-once and consumers deduplicate on `replayed`), POST /runs/:id/external/:key (programmatic resolution, `by: 'external'`; a run that settled suspended in-process auto-resumes; a run not live in this process gets the documented offline append under a lease where the store is leasable, and resumes on a worker), GET /runs/:id/cost (the settled in-process CostReport, or the pure journal fold priced by the optional `priceUsd`). Authentication stays host middleware (docs/14, OQ-16).
  - `@rulvar/core`: the Engine interface gains the readonly `stores` accessor exposing the configured journal and transcript stores; exactly the instances createEngine received (or defaulted), no store contract widens.
  - `@rulvar/testing`: `createTestEngine` forwards the new `stores` accessor.

- ebc8101: M8-T04: the redaction and retention interim rules executed (docs/14 OQ-20 and OQ-22; docs/09 section 8 rewritten to the executed state; docs/03 12.4 and 12.8; docs/06 10.1 and 10.2 amendments).

  - `@rulvar/core`: the L0 SerializationHook (`createEngine({ serialization })`): redact/encrypt at the append/put boundaries, symmetric on load/get, applied by wrapping the stores so `Engine.stores` exposes the one policy point; kernel ordering fields are drift-checked with a loud ConfigError. Default key masking at the telemetry boundary: every emitted WorkflowEvent passes `maskSecrets` (provider keys, PATs, bearer tokens, JWTs, private-key blocks become `[masked-secret]`); opt out via `redaction: { maskEvents: false }`; never touches the journal. Retention: `TranscriptStore.delete(ref)` joins the SPI (missing ref is a no-op; InMemory and File stores implement it), `Engine.deleteRun(runId)` cascades blob deletion before the journal (no orphan transcripts), and `Engine.pruneRun(runId)` deletes checkpoint blobs of ok-terminal attempts that nothing else references (parked, cancelled, escalated, and hanging attempts keep theirs).
  - `@rulvar/cli`: `createServer` and `createWorker` take the opt-in `retention` predicate over RunMeta (the server applies it at terminal settles, the worker during sweeps under a brief lease); the OTel exporter masks string span attributes with the same policy, defense in depth over the already conservative attribute content policy.
  - `@rulvar/testing`: `createTestEngine` forwards `deleteRun`/`pruneRun`.

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

### Minor Changes

- 10b45f1: M6-T11: the rulvar plan command and the M6 gating cassettes. `rulvar plan "<goal>" [--dry-run]` (the canonical grammar) loads @rulvar/planner DYNAMICALLY (the CLI's static dependency stays @rulvar/core; a missing install is a clear error), plans against the host-config engine, prints the accepted script plus its advisory diagnostics, and runs it in the worker sandbox unless --dry-run. The three docs/09 6.10 gating cassettes are recorded on the FakeAdapter and committed under the frozen-fixture lock with exported scenario builders shared by the recorder script and the replay tests: sandbox-determinism (two fresh runs of one CompiledWorkflow produce byte-identical normalized journals matching the cassette), planner-self-repair (the failing draft round-trips through the JSON-diagnostics repair, re-planning from the committed journal is free, and the accepted script executes deterministically in the sandbox), and orchestrator-crash-resume (the committed pre-crash journal plus boundary checkpoints resume with zero re-paid spawns, no duplicate spawn decisions, and byte-stable handles).

### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

## 0.6.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

## 0.4.0

### Minor Changes

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

### Minor Changes

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
