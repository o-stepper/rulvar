# @rulvar/cli

## 1.123.0

### Patch Changes

- Updated dependencies [5c46468]
  - @rulvar/core@1.123.0

## 1.122.0

### Patch Changes

- Updated dependencies [8cf45c5]
  - @rulvar/core@1.122.0

## 1.121.0

### Minor Changes

- 3d67d41: Rate provenance made checkable (RV807, RV813, RV814). The pricing row grows `ratesVerifiedAt` (SPI), the ISO date it was last verified against the provider's documented rates or, stronger, its billing categories: the shipped seeds stamp it (the GPT-5.6 family reads `2026-07-30`, the day the statement reconciliation confirmed those rates against the provider's own per-component billing categories to the cent; the pre-5.6 OpenAI rows keep their `2026-07-18` docs verification; every Anthropic row was re-verified against the documented table on `2026-07-30`). The date is surfaced wherever a dollar is consumed: `preflightEstimate` copies it onto each spawn report and `rulvar preflight` renders `ratesVerified=<date>` with its age on the spawn line; the settle pin journals it with the rest of the applied row so it survives any later table rewrite; and `rulvar invoice` prints a `rates verified:` line naming each priced model's date and age, pinned rows first, current table past them; the twelfth run's founder read the invoice doubting the rates and nothing said the seed was 12 days stale. The doctrine ships with the mechanism: seeds bound ceilings conservatively, billing truth is established only by `reconcileStatement` over saved exports, and a confirmed divergence corrects the seed in its own release with a changeset, never a silent rewrite. Enforcement rides two new gates: a weekly documented-rates audit (`scripts/rates-audit.mjs` in the live contract workflow) re-fetches exactly the pages the seed comments cite, compares every rate, write premium, and long-context tier, and opens an issue on drift or on a page that stops extracting, and a README release-table gate (`scripts/readme-release-shas.mjs`, in CI) requires every cited squash SHA to be an ancestor of HEAD, catching the v1.109.0 row that pointed at an object no branch contained for eleven releases (now corrected to the real squash `58afdb5`).

### Patch Changes

- Updated dependencies [3d67d41]
  - @rulvar/core@1.121.0

## 1.120.0

### Minor Changes

- d630c9e: The partial fan-out contract and the per-child acceptance roster (RV805, RV806). `parallel_agents` admits children sequentially in submission order, and a mid-loop admission refusal is now part of the TYPED tool result instead of a throw: the model keeps every started handle (awaitable and cancellable), and `refused` names the failed index, the typed error code, and the reason; a thrown refusal used to swallow the whole call while the started children kept spending invisibly, inviting a duplicate wave. The clean-wave result stays byte for byte `{ handles }`. The acceptance fold now journals a per-child machine roster inside its single decision and carries it as `acceptanceChildren` on the envelope, the `RunOutcome`, and `run:end` (same lift and malformed-drops-silently posture as the salvage lists, mirrored to OTel as `rulvar.run.acceptanceChildren`): each spawned child with its settled status, the salvage arm that accepted it, and, where the child declared an evidence contract, the evidence verdict `{ recordedEntries, minEntries, met }` with `waivedBySalvage: true` on a below-floor child a salvage arm accepted anyway; the twelfth comparison run accepted two below-floor children through salvage and nothing machine-readable said so. Behind it, a declared evidence contract now stamps EVERY settled `AgentResult` with `evidence` (the same window-derived count as the enforce-refuse floor), absent without a contract so those results stay byte-identical. `rulvar inspect` prints the acceptance verdict with the completion, the salvage lists, and the per-child evidence verdicts from the journaled decision, plus journaled `quota_drift` decisions labeled per-minute window, not cumulative. The guides now state the gating rule outright: gate on the (`status`, `completion`) pair, never on `status` alone.

### Patch Changes

- Updated dependencies [d630c9e]
  - @rulvar/core@1.120.0

## 1.119.0

### Patch Changes

- Updated dependencies [1e4ff3c]
  - @rulvar/core@1.119.0

## 1.118.0

### Patch Changes

- Updated dependencies [f8341a3]
  - @rulvar/core@1.118.0

## 1.117.0

### Minor Changes

- c15b83a: Tool executions become real OTel child spans and the agent span survives to its end (RV802, the twelfth experiment's P0 #2). Tool events ride the agent's `spanId` and carry no per-call id, so `toOtel` previously swallowed every `tool:start` as a duplicate opener of the agent span and let the FIRST `tool:end` close the agent span itself: `agent:end` then attached usage, cost, and the exploration counters to nothing, later tool events reopened and reclosed agent-keyed spans, and in the twelfth comparison run all 569 tool events of the live stream produced zero tool spans while every agent span carried a tool's duration and outcome. The exporter now pairs each `tool:start` with its `tool:end` under a synthetic FIFO key per `(agent span, tool name)` and starts a `tool <name>` child span of the agent span: the agent span closes only at `agent:end` with the whole dispatch's usage, cost, `rulvar.retry_count`, and `rulvar.exploration.*`; a denied call closes its own span with `rulvar.status: 'denied'` and the `rulvar.tool.guard` marker on the tool span; concurrent same-name calls keep exact counts, parentage, and durations (attribution may swap among identically named spans, the best the id-less vocabulary allows); and a `tool:end` with no matching start, the foreign or truncated stream shape, attaches as a span event instead of closing anything.

### Patch Changes

- @rulvar/core@1.117.0

## 1.116.0

### Patch Changes

- Updated dependencies [a213878]
  - @rulvar/core@1.116.0

## 1.115.0

### Patch Changes

- Updated dependencies [63642ae]
  - @rulvar/core@1.115.0

## 1.114.0

### Patch Changes

- Updated dependencies [5759731]
  - @rulvar/core@1.114.0

## 1.113.0

### Minor Changes

- a60807a: The pricing composition's second half names itself, and the effect-ledger quarantine is byte-true (RV706, RV707). `InvoicePricingProvenance` gains optional `currentPricingVersion`: on composed exports it is the version of the caller's current table, the one that priced everything past `pinnedThroughSeq` (on current-table exports, the whole fold), so an invoice folded across a rotation now names both halves of the composition where the pinned segments already declared theirs; `rulvar invoice` and `rulvar inspect` fill it from the configured table and extend their text suffix to `pins composed with the current table (v-a, v-b; current v-live)`, byte for byte unchanged when the config declares no version. The executor ledger's torn-tail quarantine row now carries `bytesBase64` and `sha256` of the exact torn bytes alongside the lossy `bytes` string kept for old readers (two different byte tails used to collapse into one indistinguishable row), and the repair's parseable decision is made on the bytes, strict UTF-8 before `JSON.parse`: the lossy decode could make a fragment with invalid bytes inside a string literal parse, and the repair then terminated a line of invalid bytes in place, manufacturing exactly the corruption the fail-closed scan refuses.

### Patch Changes

- Updated dependencies [a60807a]
  - @rulvar/core@1.113.0

## 1.112.0

### Patch Changes

- Updated dependencies [00ae55b]
  - @rulvar/core@1.112.0

## 1.111.0

### Patch Changes

- Updated dependencies [fd25169]
  - @rulvar/core@1.111.0

## 1.110.0

### Patch Changes

- Updated dependencies [58afdb5]
  - @rulvar/core@1.110.0

## 1.109.0

### Patch Changes

- Updated dependencies [85b1d39]
  - @rulvar/core@1.109.0

## 1.108.0

### Minor Changes

- affa3d4: Stored consumers compose the pricing pins exactly like the engine, and the invoice provenance declares every pinned version (RV611).

  `JournalPricingSnapshot` exports the composition the engine's outcome mirror applies at settle: `composedPriceUsd(current)` prices pin-covered rows at the rates their own settle recorded and everything past the last pin (a segment journaled but never settled) at the caller's current table. The engine now consumes the same method, and the three stored consumers (`rulvar inspect`, `rulvar invoice`, the server's stored-run cost endpoint) fold through it instead of passing the raw snapshot, which silently priced the tail at the last pin's rates and folded never-pinned models as unpriced even when the current table knows them. Two fallbacks stay deliberate and documented: a covered model its covering pin missed back-reprices at the last pin when that pin names it, and a model no pin resolves falls to the current table.

  The snapshot also carries `segments` (every pin's seq boundaries, `pricingVersion`, and rows in journal order), and `InvoicePricingProvenance` gains the `'composed'` source plus `segments` and `pinnedThroughSeq`, so an invoice folded across a price-table rotation names every version that priced it instead of hiding the rotation behind the last one. The CLI exports that priced through a pin now declare `source: 'composed'` (previously `'snapshot'`), and the `pricing rates:`/`pricing:` text lines name the composition and every pinned version.

### Patch Changes

- Updated dependencies [affa3d4]
  - @rulvar/core@1.108.0

## 1.107.0

### Patch Changes

- Updated dependencies [9f5f6f6]
  - @rulvar/core@1.107.0

## 1.106.0

### Patch Changes

- Updated dependencies [9a4ce49]
  - @rulvar/core@1.106.0

## 1.105.0

### Patch Changes

- Updated dependencies [531dc88]
  - @rulvar/core@1.105.0

## 1.104.0

### Patch Changes

- @rulvar/core@1.104.0

## 1.103.0

### Patch Changes

- Updated dependencies [f2b809e]
  - @rulvar/core@1.103.0

## 1.102.0

### Patch Changes

- Updated dependencies [3eb6515]
  - @rulvar/core@1.102.0

## 1.101.0

### Patch Changes

- Updated dependencies [51b215c]
  - @rulvar/core@1.101.0

## 1.100.0

### Patch Changes

- Updated dependencies [9785bea]
  - @rulvar/core@1.100.0

## 1.99.1

### Patch Changes

- ef08d73: Guarantee matrix and exactly-once claim hygiene (RV508); no runtime behavior changes. The isolated-executor guide now carries the guarantee matrix stating flatly who provides what: the library's layers give at-least-once execution with attempt binding and intent-before-effect, exactly-once effect execution is promised by NO library layer, and what IS exactly-once is pay and replay (the never-pay-twice invariant). The two claims the ninth comparison experiment's judge caught are rewritten to the precise statements ("each ran once" became attempt counting under a stable idempotency key; the approvals guide now says continuation is a run-level guarantee, not an effect-level one, with the at-least-once window named); `ctx.step` docs state the same window for effectful steps; a `ResolutionBy` note says the field records a channel, never a verified principal (identity, signatures, and separation of duties are host IAM). The worker header now points at the shipped `SqliteQuotaLimiter` and `PostgresQuotaLimiter` instead of denying that cross-process limiters exist. A new docs-lint sentinel forbids "exactly once" claims in the hand-written docs and in package source comments outside a vetted (file, heading anchor) allowlist (the durability pay doctrine and the guarantee matrix), and every remaining occurrence in doc prose and source comments was rewritten to the precise wording; string literals are deliberately out of scope (tool descriptions enter the toolset hash).
- Updated dependencies [ef08d73]
  - @rulvar/core@1.99.1

## 1.99.0

### Patch Changes

- Updated dependencies [9e00888]
  - @rulvar/core@1.99.0

## 1.98.0

### Patch Changes

- @rulvar/core@1.98.0

## 1.97.0

### Minor Changes

- 5c3b453: Per-request cost accounting and per-segment pricing pins (RV504/RV505/RV511, the ninth-experiment accounting P1s).

  RV504: when a terminal entry's per-dispatch `providerCalls` exactly cover its usage, `costReportFromJournal` and `invoiceFromJournal` now price each provider call individually, so a nonlinear long-context tier fires per REQUEST, which is the pricing contract's stated semantics. An aggregate that crossed a threshold no single request crossed no longer re-prices the whole entry: the ninth comparison experiment's settled report ran 52.4% above the live budget's per-dispatch debits for exactly this reason, and the two figures now converge. Entries without records, or with records that do not cover their usage, fold exactly as before (the per-model aggregate), and the invoice says so: `rowUsdNonAdditive` is now a computed boolean (false exactly when every contributing entry is fully attributed, so the per-call rows sum to the total; `allocatedUsd` remains the column that sums exactly in every case). The shared fold is public: `priceEntryBilling` with `EntryBillingUnit`/`EntryBillingFold` beside `priceEntryUsage`.

  RV505: `journalPricingSnapshot` now composes the run-settle pricing pins by their settle seq, with no journal shape change: a seq-aware fold prices each row under the pin of ITS OWN segment (the rates its live debits actually used), so a suspend/resume across a price-table rotation no longer re-prices settled history under the new table. Seq-less callers keep the historical last-pin behavior. `priceUsd` callbacks across the accounting folds accept an optional third `seq` argument (existing two-argument implementations are unaffected), the snapshot exposes `pinnedThroughSeq`, and the engine's settled-outcome cost mirror composes pinned history with the live table for the segment being settled.

  RV511: the CLI invoice text output now states the pricing basis honestly per export: additive per-request rows, or the aggregate basis with the reason (a remainder or legacy entry in the fold).

### Patch Changes

- Updated dependencies [5c3b453]
  - @rulvar/core@1.97.0

## 1.96.0

### Patch Changes

- @rulvar/core@1.96.0

## 1.95.0

### Patch Changes

- @rulvar/core@1.95.0

## 1.94.0

### Minor Changes

- 426e57d: The SSE replay buffer of `createServer` is finite by default (RV409): an absent `maxBufferedEventsPerRun` now resolves to the exported `DEFAULT_MAX_BUFFERED_EVENTS_PER_RUN` (50,000 events per run) instead of unbounded, with the already established drop semantics past the bound (oldest events dropped in chunks, the retained window never below seven eighths of the bound, replays carrying `x-rulvar-events-dropped` and a leading SSE comment naming the first retained seq; the journal remains the durable record). Migration: a deployment that relied on the historical unbounded buffer sets an explicit huge bound, for example `Number.MAX_SAFE_INTEGER`; nothing changes for servers that already configured the option, and the option's domain (a positive safe integer, typed `ConfigError` otherwise) is unchanged.

### Patch Changes

- @rulvar/core@1.94.0

## 1.93.0

### Patch Changes

- Updated dependencies [c62150a]
  - @rulvar/core@1.93.0

## 1.92.0

### Minor Changes

- 351d1f5: Historically stable invoices via the applied-pricing pin (RV407, the eighth-experiment review). The invoice and cost folds price at fold time, so a live price-table update used to silently re-price history. When `createEngine({ pricing })` is configured, the settling segment now pins what it actually applied, the resolved pricing row of every model the journal used plus the table's `pricingVersion`, additively inside the existing run-settle decision value (the `outputHash` precedent: no journal shape change). The pin is gated on the configured table deliberately: caps-fallback pricing arrives ambiently from adapters and a setting the user never enabled must not change the journal, so table-less runs settle byte for byte as before; rates the fold would refuse anyway, non-finite or negative, are never pinned. New `journalPricingSnapshot(entries)` reads the pin back and rebuilds a `priceUsd` over exactly the pinned rows (absent models fold as unpriced, never a silent zero); `invoiceFromJournal` accepts a declared provenance and the export carries `pricing: { source: 'snapshot' | 'current-table', pricingVersion?, rows? }`. `rulvar invoice`, `rulvar inspect`, and the server's stored-run cost endpoint prefer the pin, so a repeated fold after the table changes reproduces the original numbers; journals settled before the pin keep the current-table fold and say so. Live pricing, budget admission, and journaled spend debits are untouched.

### Patch Changes

- Updated dependencies [351d1f5]
  - @rulvar/core@1.92.0

## 1.91.0

### Patch Changes

- @rulvar/core@1.91.0

## 1.90.0

### Patch Changes

- Updated dependencies [9603940]
  - @rulvar/core@1.90.0

## 1.89.0

### Patch Changes

- Updated dependencies [f18b671]
- Updated dependencies [f18b671]
  - @rulvar/core@1.89.0

## 1.88.0

### Patch Changes

- Updated dependencies [3b339d9]
  - @rulvar/core@1.88.0

## 1.87.0

### Patch Changes

- Updated dependencies [c4c02b1]
  - @rulvar/core@1.87.0

## 1.86.0

### Patch Changes

- Updated dependencies [2f71894]
  - @rulvar/core@1.86.0

## 1.85.0

### Minor Changes

- 6932a9f: Three fail-closed fixes from the cycle 83 sweep, plus the dependency refresh.

  **Engine.** A typed error thrown out of `ProviderAdapter.stream()` now keeps its own class instead of being laundered into a retryable transport fault. A `ConfigError` (a bridged model id that does not match the wrapped model, an unsupported role, a namespaced option contradicting a canonical field) used to be retried through the whole backoff ladder and then trigger transport failover, so a misconfigured primary silently served the run from a fallback model the caller never asked for while the real fault vanished behind a generic message. Typed errors that ARE retryable by class (a lost lease) keep retrying exactly as before, and an untyped throw is still a retryable transport fault.

  **Planner sandbox.** The realm scrub replaced `Date.now` and `Math.random`, which left three ambient sources open: a bare `new Date()` never consults `Date.now` (V8 reads the system clock directly), `performance.now()` is a second live clock, and WebCrypto (`crypto.randomUUID()`, `crypto.getRandomValues()`) is raw entropy. Those are the first idioms a machine-written script reaches for, and each silently produced a run that could not reproduce on replay. All of them now draw from the same seeded stream: zero-argument `new Date()` and `Date()` take the logical clock, `performance.now()` is that clock minus the segment base, `crypto.randomUUID()` is the journaled uuid shim, and `crypto.getRandomValues()` fills from the seed. Passing a timestamp or a date string to `Date` stays a pure conversion.

  **Server.** A tracked run whose segment REJECTS instead of settling (the genesis ownership boot refusing a run another process owns, a withheld settlement whose durable write failed) was reported as `running` for the life of the process, its SSE connections never closed, and neither retention nor the settled cap could release it. `GET /runs/:id` now answers `status: "error"` with the typed wire error, connected streams close with a comment naming the failure, a late subscriber gets that comment instead of an empty stream, and the tracked run becomes eligible for retention like any other terminal run.

  **Dependencies.** `@anthropic-ai/sdk` moves to `^0.115.0` (the only shipped floor its caret was blocking); in-range minors refresh across the workspace. The four majors stay held: eslint 10 and `@eslint/js` 10, `@types/node` 26 against the Node 22.12 floor, and TypeScript 7. The tsdown resolution is pinned at 0.22.3 because it generates the frozen `.d.ts` artifacts, including the published `@rulvar/compat` tarball that must repack byte identical.

### Patch Changes

- Updated dependencies [6932a9f]
  - @rulvar/core@1.85.0

## 1.84.0

### Patch Changes

- @rulvar/core@1.84.0

## 1.83.0

### Patch Changes

- @rulvar/core@1.83.0

## 1.82.0

### Patch Changes

- 9cc5d66: The free-cleanup harvest (cycle 80). `leasableStoreConformance` gains the `expiry` option: the mandatory lease checks follow the suite's no-wall-clock convention, so the harness now hands them a store whose ttl no scheduler stall can cross, and only the wall-clock expiry check keeps a short-ttl store of its own; the legacy single-`ttlMs` pairing let one CI stall past 150 ms expire a just-acquired lease inside a fencing check (the flake observed on Node 22). All three shipped harnesses move to the split pairing, and the store-authors guide stops recommending the flaky shape. In `@rulvar/cli`, worker retention is no longer slot-bound: a worker whose every concurrency slot is busy still applies retention over settled runs during its sweeps instead of starving until idle. In `@rulvar/core`, concurrent cold `tools()` calls on an MCP source share one in-flight `tools/list` fetch instead of each sweeping the list, and `AdmissionController`'s `maxTotalSpawns` TSDoc now tells the truth: it is the controller-lifetime cap on admitted spawns for hosts driving the controller directly (pinned by a test), while engine runs cap totals through `budgetDefaults.lifetimeSpawnCap`; the old comment claimed it was the per-orchestrate `maxSpawns`.
- Updated dependencies [9cc5d66]
  - @rulvar/core@1.82.0

## 1.81.2

### Patch Changes

- 296885b: Three defects from a deep review of the MCP bus and the queue worker (cycle 79). In `@rulvar/cli`, `createWorker().stop()` now waits out a sweep that is still scanning the store before taking its cancel snapshot, and a sweep observes the stop before every lease: previously a stop() racing an in-flight sweep could resolve while that sweep went on to lease and drive a new run, leaving a live run and a held lease behind a "stopped" worker. In `@rulvar/core`, the MCP tool source no longer loses a `listChanged` notification that races the in-flight `tools/list` fetch (the fetched list is served but never pinned as the session cache, so the next snapshot refetches), and cursor pagination treats an empty `nextCursor` as exhaustion instead of spinning the import loop forever on a server that echoes it. A regression test also pins the SDK-level rejection of a declared `outputSchema` with no `structuredContent`, guarding the planned SDK v2 migration.
- Updated dependencies [296885b]
  - @rulvar/core@1.81.2

## 1.81.1

### Patch Changes

- Updated dependencies [c030982]
  - @rulvar/core@1.81.1

## 1.81.0

### Patch Changes

- Updated dependencies [ce4c392]
  - @rulvar/core@1.81.0

## 1.80.0

### Patch Changes

- Updated dependencies [262e397]
  - @rulvar/core@1.80.0

## 1.79.0

### Minor Changes

- 85956ab: Terminal admission at an exhausted tool budget, the two harness-shape preflight findings, and the degradation mirror (the fifth comparison experiment).

  The fifth experiment lost a complete 3984 word answer to terminal tool starvation: the harness set the synthesis tool cap to the child count, the mandatory `get_child_result` reads spent the whole budget, and the ready `finish` was cut BEFORE the terminal interception, so the validators never ran, the funded repair reserve never armed, and the run failed closed with the candidate stranded in the transcript.

  - The terminal tool is now exempt from the tool budget in both directions: it never consumed `maxToolCalls` or `toolUnits` below the cap, and an exhausted budget no longer starves it either. An admitted finish validates and, on rejection, feeds the repair grants exactly as below the cap; non-terminal calls beside it are answered with typed skipped results so the continued exchange keeps a well formed history; a batch with only non-terminal calls past the cap settles `limit` byte identically to before.
  - New preflight warning `synthesis-terminal-tool-headroom`: `synthesis.exposeChildResultTools` with a `synthesis.limits.maxToolCalls` below one read per possible child (`orchestrator.maxSpawns`) loses evidence access to the reads themselves.
  - New preflight warning `draft-gate-below-contract`: a `draftPolicy.minWords` below the contract's own word minimum admits drafts the final validators must reject, so the paid synthesis starts from an underlength base. The preflight input mirrors `finishValidation.draftPolicy` for it.
  - The completion lift now mirrors the degradation facts the acceptance envelope already emits: `degradedReasons`, `salvagedPartialChildren`, and `salvagedTerminalOutputChildren` ride `run:end` and the `RunOutcome` under the same shape validation as `completion` and `childStatusCounts`, and the OTel exporter maps them to `rulvar.run.*` attributes. An empty array is the workflow's claim of zero degradation; absence means no claim.

### Patch Changes

- Updated dependencies [85956ab]
  - @rulvar/core@1.79.0

## 1.78.0

### Patch Changes

- Updated dependencies [941b6e1]
  - @rulvar/core@1.78.0

## 1.77.0

### Patch Changes

- Updated dependencies [6aba271]
  - @rulvar/core@1.77.0

## 1.76.0

### Patch Changes

- Updated dependencies [22cba47]
  - @rulvar/core@1.76.0

## 1.75.1

### Patch Changes

- Updated dependencies [82bc0f0]
  - @rulvar/core@1.75.1

## 1.75.0

### Patch Changes

- Updated dependencies [c486de8]
  - @rulvar/core@1.75.0

## 1.74.0

### Minor Changes

- d94beab: Quota drift telemetry and the honest zero (the v1.71 experiment review, P0.5 resized + P1.4). The experiment declared 12M TPM over a provider-real 1M, the local limiter went quiet, and seven live 429s followed with nothing recording the mismatch. Now: both wire adapters parse the provider's x-ratelimit headers on every real 429 into normalized per-minute limits (`WireError.data.reportedLimits`; the openai wire also gains the raw bucket capture the anthropic wire already had), the loop remembers them per (provider, model) as live telemetry, and the opt-in `quota.declaredRules` (the SAME rule array preflight takes) makes the engine journal a `quota_drift` decision plus a warn log whenever a binding declared cap EXCEEDS the provider-reported one, per invocation and dimension, with anthropic's split input and output windows summed against a combined declared tokensPerMinute. Purely observational, synthetic limiter denials never count, and without declaredRules journals and events stay byte identical. On the invoice, an `unconfirmed` row that recorded zero usage on every counter now carries `usageUnknown: true` (export-level `usageUnknownRows` count, CLI `usage-unknown` marker): the zeros mean "nothing recorded", never "the provider metered nothing"; derived at export time, no journal shape change.

### Patch Changes

- Updated dependencies [d94beab]
  - @rulvar/core@1.74.0

## 1.73.0

### Minor Changes

- 3e95bd1: The synthesis repair envelope (the v1.71 experiment review, P0.4/P0.8/P1.7): `finishValidation.repairTurnReserve` grants bounded EXTRA turns to the invocation the validators bind, one per rejected finish exchange (schema-invalid finish arguments and host validation rejections alike), derived from the message window itself so resumes recount identically and nothing new journals; the deliberately-deferred RV-204 reserve, now that the experiment showed one malformed finish plus one validator rejection killing a whole run inside maxTurns 3. Every typed synthesis failure now carries the acceptance snapshot (`completion`, `childStatusCounts`, lifted onto the error outcome by the completion mirror, so an errored run still reports "the fan-out work is complete") and the verdict-derived repair taxonomy (`repairsUsed`, `maxRepairs`, `rejectedValidators`) read from journaled decisions. `preflightEstimate` models the separate synthesis invocation (`orchestrator.synthesis`: limits, model, estInputTokens; echoed at `budget.orchestrator.synthesis`, priced into `exposure.runCeiling`, the gap the experiment's projection stopped short of) and folds a declared `finishValidation.repairTurnReserve` into the projected turns of the bound invocation; the CLI prints the synthesis projection line. Zero reserve and no synthesis declaration keep every ceiling, journal, and report byte identical.

### Patch Changes

- Updated dependencies [3e95bd1]
  - @rulvar/core@1.73.0

## 1.72.0

### Patch Changes

- Updated dependencies [662e9e0]
  - @rulvar/core@1.72.0

## 1.71.0

### Minor Changes

- 20d02e0: The preflight quota planner follows the run past the first wave (the second experiment report, rec 9). Every declared spawn now reports `projectedProviderTurns`, the provider-call ceiling of its whole loop (`maxTurns` bounded by the executed-call ceiling plus the final no-tool turn, plus the finalization summary turn when a tool budget limiter arms it), and the orchestrator echoes its own. `exposure.runCeiling` totals the declared wave run to those ceilings at the declared estimates: provider calls as fan-out times per-spawn turns, and cumulative tokens with the context regrowing every turn (turn k re-sends the declared prompt plus the k-1 prior output bounds, so a K-turn loop costs K x est + outputBound x K(K+1)/2). Three findings compare that projection against the declared `quotaRules` when the first-wave checks stay silent: `quota-requests-below-run` (the loops project more wire requests than `requestsPerMinute` admits; the message names about how many windows the run needs at best), `quota-tokens-below-run` (the regrowth cumulative exceeds `tokensPerMinute`), and the spawn-attributed `quota-turn-never-fits` (by turn k the single context-grown reservation exceeds the whole token window, which the limiter denies with `retryAfterMs 0` and no wait helps). The first-wave checks are byte-identical, and a run whose ceiling fits its windows produces exactly the findings it did before. `rulvar preflight` prints the new turn ceiling per spawn and the run ceiling on the exposure line; `--json` carries the fields verbatim. The experiment run behind the recommendation had zero preflight quota findings and eleven live limiter denials; this projection is what would have said so before the first dispatch.

### Patch Changes

- Updated dependencies [20d02e0]
  - @rulvar/core@1.71.0

## 1.70.1

### Patch Changes

- @rulvar/core@1.70.1

## 1.70.0

### Patch Changes

- @rulvar/core@1.70.0

## 1.69.0

### Patch Changes

- Updated dependencies [b21a681]
  - @rulvar/core@1.69.0

## 1.68.0

### Patch Changes

- Updated dependencies [b227874]
  - @rulvar/core@1.68.0

## 1.67.0

### Minor Changes

- 8e6006d: The honest invoice (the experiment review, items 11.2/11.3, recommendations P1.2/P1.3/P1.4). The reconciliation verdict now names exactly what it asserts: the value `matched` is renamed to `provider-id-present`, because the library never sees provider billing data and the old term read as a statement match it cannot make (deeper reconciliation tiers are host-side joins keyed on `responseId`). Consumers comparing `row.reconciliation === 'matched'` must switch to `'provider-id-present'`; `reconciliationFailures` keeps its meaning (rows without a provider id). `InvoiceExport` is now self-describing about pricing: `pricingBasis: 'per-call'` declares that per-row `usd` prices each call individually at current rates, and `rowUsdNonAdditive: true` warns that those values need not sum to `totalUsd` under a nonlinear price table (long-context tiers price a split differently from its sum). For consumers whose rows must sum, every `InvoiceRow` gains the additive `allocatedUsd` column: each (entry, serving model) slice of the same gross fold the totals run is distributed across its rows in proportion to per-row `usd` (token weights when every row priced to zero), one row absorbs the IEEE rounding dust, and the flat sum over `rows` reproduces `totalUsd` exactly. `rulvar invoice` prints the declared basis in the text form and passes the new fields through `--json` unchanged.

### Patch Changes

- Updated dependencies [8e6006d]
  - @rulvar/core@1.67.0

## 1.66.0

### Patch Changes

- Updated dependencies [1b8987e]
  - @rulvar/core@1.66.0

## 1.65.0

### Patch Changes

- Updated dependencies [0b6b859]
  - @rulvar/core@1.65.0

## 1.64.0

### Patch Changes

- Updated dependencies [991f9b5]
  - @rulvar/core@1.64.0

## 1.63.0

### Patch Changes

- Updated dependencies [8a28aed]
  - @rulvar/core@1.63.0

## 1.62.0

### Minor Changes

- fca5fd1: Ship the preflight effective-limits estimator and effective-config linter (the experiment-review P2.2): everything the engine derives from a configuration, computed before any provider dispatch, machine readable, with zero paid requests by construction.

  Core exports `preflightEstimate(input)`: a pure function over the same options `createEngine` and `engine.run` receive plus a declared spawn wave, returning the JSON-serializable `PreflightReport`. The estimate cannot drift from the engine because it reuses the runtime's own arithmetic: `mergeUsageLimits` for the effective per-spawn limit merge (call over profile over engine defaults), `admissionReserveUsd` for the layer-1 reserve formula arm for arm (estCost, profile estCost, the priced estimate from `estInputTokens`, the flat default, and the unpriced-model zero), the settlement price resolution, and the shared-quota dimension match. The report carries the admission projection over the declared wave mirroring `admitSpawn` exactly (which spawns admit, which are denied and by what: budget, spawn cap, orchestrator maxSpawns, or an orchestrator cap its own reserve cannot fit), the per-tool and weighted-unit executed-call ceilings with the first bottleneck named, the orchestrator effective cap and finalize reserve echo, the concurrency and per-provider exposure floors with the one-more-turn overshoot floor, and the linter findings with stable kebab-case codes (errors: `unrouted-role`, `unknown-profile`, `nothing-admitted`, `orchestrator-cap-below-reserve`; warnings: `partial-admission`, `weighted-units-bind-first`, `tool-unaffordable`, `unpriced-under-ceiling`, `inert-finalization-reserve`, `inert-tool-budget-notices`, `orchestrator-cap-fraction-bound`, the quota-window comparisons; infos: `overshoot-exposure`, `no-usd-ceiling`, `no-quota`, `per-tool-cap-unreachable`).

  The CLI gains `rulvar preflight <file|name> [--budget-usd N] [--profile NAME] [--spawns JSON] [--json]`: it assembles exactly the options `rulvar run` would (config, module exports, run profile) but constructs no engine, opens no store, and dispatches nothing. The declared wave comes from the new `preflight` export of the config or workflow module (`{ spawns?, orchestrator?, quotaRules? }`), `--spawns` overrides it, `--json` emits the machine-readable report, and the exit code is the linter contract: 1 when any finding has severity error.

### Patch Changes

- Updated dependencies [fca5fd1]
  - @rulvar/core@1.62.0

## 1.61.0

### Minor Changes

- b4c1f1f: Durable provider reconciliation (the experiment-review P1.3): every live provider dispatch now mints a `ProviderCallRecord` on the terminal entry's `providerCalls` ledger, the CostReport splits gross from net, and `invoiceFromJournal` plus `rulvar invoice` export the rows.

  - **The per-dispatch ledger.** Every wire call the engine actually makes, successful or not, records `{ ordinal, role, servedBy, attempt, outcome, responseId?, usage, usageApprox?, errorCode?, aborted? }`, minted at the single dispatch chokepoint from the same sanitized usage the phase slices accumulate. Failed and retried attempts keep their billed usage attributable instead of dissolving into the aggregate; quota denials and abort short circuits that never reached the adapter mint nothing. The provider `responseId` both shipped adapters already surface on every finish is now persisted. The ledger rides every checkpoint boundary (kill-and-resume keeps pre-kill calls attributable, ordinals continuing) and restores verbatim on replay with zero live calls.
  - **Gross versus net.** `CostReport.totalUsd` stays the net ledger it always was (abandoned subtrees contribute zero). New required fields make the provider's view first class: `grossUsd` (net plus abandoned, the figure an invoice reconciles against; abandoning a branch never shrinks it) and `abandoned: { usd, unpriced, usageApprox? }`. `rulvar inspect` prints the gross line whenever a run abandoned paid work.
  - **The invoice export.** `invoiceFromJournal(entries, priceUsd)` returns one row per billable call with a reconciliation verdict per row: `matched` (response id present), `missing-provider-id` (a finished call without one), `unconfirmed` (a failed or severed call without one), `unattributed` (pre-ledger entries and restored remainders; the spend surfaces instead of vanishing). Totals are the same slice fold the CostReport runs, so `totalUsd === CostReport.grossUsd` exactly. `rulvar invoice <runId> [--json]` is the CLI form.

  The frozen cassette catalog is re-recorded for the additive `providerCalls` field on terminal agent entries (journal-shape-revision, policy not identity: no hashVersion change, no matching impact).

### Patch Changes

- Updated dependencies [b4c1f1f]
  - @rulvar/core@1.61.0

## 1.60.0

### Patch Changes

- Updated dependencies [59bbeaa]
  - @rulvar/core@1.60.0

## 1.59.4

### Patch Changes

- Updated dependencies [c49d7a1]
  - @rulvar/core@1.59.4

## 1.59.3

### Patch Changes

- Updated dependencies [deaef36]
  - @rulvar/core@1.59.3

## 1.59.2

### Patch Changes

- Updated dependencies [dd0e10f]
  - @rulvar/core@1.59.2

## 1.59.1

### Patch Changes

- Updated dependencies [c127770]
  - @rulvar/core@1.59.1

## 1.59.0

### Patch Changes

- Updated dependencies [615dc90]
  - @rulvar/core@1.59.0

## 1.58.0

### Minor Changes

- 4fa35ce: RV-217: data protection hooks, the full close. The plan's gate ("PII never persists or emits in plaintext under policy") now holds end to end. (1) ENVELOPE ENCRYPTION on the serialization seam: `createEnvelopeEncryption({provider, historicalWrappedKeys?, plaintextReads?})` returns a `SerializationHook` that AES-256-GCM encrypts every persisted byte (journal payloads, transcript blobs, checkpoints) with entry identity as associated data (a ciphertext moved between entries or refs fails authentication), keeping only the kernel-pinned ordering/identity fields plus spanId and timestamps plaintext; `DataKeyProvider` is the KMS seam (the exact shape of GenerateDataKey/Decrypt, called only in the async factory so the sync hooks run on in-memory data keys, and every envelope carries its wrapped key so reads need no live KMS); the shipped `localKeyProvider` derives KEKs via HKDF-SHA256 with an `info` partition for tenant-scoped keys (a different tenant's provider cannot unwrap, pinned by tests); reads of non-enveloped data fail closed by default with `plaintextReads: 'passthrough'` as the explicit migration mode; `fromStored(toStored(e))` reproduces entries exactly, so replay, resume, and recovery are untouched and a run over real files greps to ZERO plaintext PII while `Engine.stores` reads plaintext through the one policy point. (2) REDACTION POLICY: `redaction.patterns` adds host-defined patterns (RegExp or strings, compiled once, typed ConfigError on an invalid one) on top of the default credential set for every emitted event, via the new exported `compileSecretMasker`; the OTel exporter accepts the same `patterns` for trace parity. (3) EXPORT/IMPORT: `engine.exportRun(runId)` produces the portable bundle (meta, entries, blobs) read through the policy point, so encrypted deployments export plaintext for subject-access requests; `engine.importRun(bundle)` writes through the target's stores (re-encrypting under its policy), keeps the original runId, and refuses an existing run typed; together with the existing `deleteRun`/`pruneRun` this completes the retention/deletion/export surface. (4) SALTED METADATA DIGESTS: `security.argsHashSalt` switches `RunMeta.argsHash` to HMAC-SHA256 under a deployment salt (equal args stop correlating across deployments; low-entropy args stop being recoverable from the digest), `hashRunArgs` gains the optional salt, and the CLI resume args gate picks the salt up from `engineOptions.security` automatically. (5) AUDIT TRAIL: `reduceAuditTrail(entries)` folds a journal into the typed, ordered sequence of authority events (suspensions with deadlines, resolutions with who and what, abandons with reasons, engine decisions, termination denials, run settles), tolerant across journal vintages. New guide page: https://docs.rulvar.com/guide/data-protection.

### Patch Changes

- Updated dependencies [4fa35ce]
  - @rulvar/core@1.58.0

## 1.57.0

### Patch Changes

- Updated dependencies [5897232]
  - @rulvar/core@1.57.0

## 1.56.0

### Patch Changes

- Updated dependencies [f26dba0]
  - @rulvar/core@1.56.0

## 1.55.0

### Patch Changes

- Updated dependencies [e9b005b]
  - @rulvar/core@1.55.0

## 1.54.0

### Minor Changes

- 3f6bc03: Three improvement-plan remainders: the `run:end` semantic completion lift (RV-207 tail), the standard repository research toolset (RV-210), and incremental synthesis with pre-model claim deduplication (RV-211).

  **The completion lift.** Transport status and semantic completeness are different claims, and `run:end` now carries both: a workflow that returns an object result with a valid `completion` literal (`'complete' | 'partial' | 'rejected'`) and optionally a `childStatusCounts` record, or throws a typed error whose `data` carries them, gets both lifted onto the `run:end` event. The orchestrator acceptance path emits the envelope on every terminal, including the typed rejection (its `FailRunError` data now carries `completion: 'rejected'`). Malformed shapes stay silently absent, replay recomputes identical fields, the CLI progress line renders `completion=...`, and the OTel exporter maps `rulvar.run.completion` and `rulvar.run.childStatusCounts`.

  **The repository research toolset.** `repositoryResearchToolset({ root })` ships five `risk: 'read'` tools over a confined directory root: `list_files`, `search_files`, and `read_file` with deterministic byte ordering and STABLE keyset cursors (a page boundary never shifts when unrelated entries appear; every cursor embeds its query identity), plus `record_evidence`, which verifies citations at collection time (the file must exist under the root, `lines` must be a valid 1-based range inside it, `quote` must appear verbatim), and `list_evidence`. Pages are canonical: byte-identical however addressed, which is exactly what the exploration guards measure, so `maxRepeatedToolSignature` and `maxNoNewEvidenceCalls` compose with the kit instead of being defeated by marker fields. Absolute paths, `..` escapes, and symlink escapes are typed error results; the host reads collected evidence via `kit.evidence()`.

  **Incremental synthesis and claim dedup.** `synthesis.mode: 'incremental'` dispatches one bounded `synthesize`-role NOTE invocation per settled child the moment it settles (default `noteLimits` `{ maxTurns: 2 }`), overlapping the still-running fan-out, and the final result is a DETERMINISTIC reconciliation envelope (`IncrementalSynthesisResult`), never another model call; a dead note falls back to that child's raw digest summary under a journaled per-child `orchestrator_synthesis_note_fallback` decision, replay reproduces the envelope with zero paid calls, and `finishValidation` plus incremental mode is a `ConfigError` at intake because the reconciliation has no model-composed finish to validate. `synthesis.dedupeClaims: true` deduplicates repeated claim lines across children BEFORE any model call (whitespace-collapsed exact matching via the exported pure `dedupeRepeatedClaims`, never fuzzy): in single mode the digest keeps first occurrences with a `REPEATED CLAIMS` index riding the prompt, in incremental mode the envelope carries `repeatedClaims`. Both options default off and the synthesis prompt stays byte-identical when unset.

### Patch Changes

- Updated dependencies [3f6bc03]
  - @rulvar/core@1.54.0

## 1.53.0

### Patch Changes

- Updated dependencies [b821bd1]
  - @rulvar/core@1.53.0

## 1.52.0

### Minor Changes

- e138df9: Ship the RV-210 exploration guards (first slice): three opt-in `UsageLimits` fields that make an oscillating tool loop visible and boundable. `toolBudgetNotices` surfaces soft 50%/80% thresholds over `maxToolCalls` to the model as a plain user message with the exact remaining count (once per threshold, checkpoint-safe, inert with a loud warning without `maxToolCalls`). `maxRepeatedToolSignature` caps executions of the byte-identical call (tool name plus RFC 8785 canonical args): the excess call is never dispatched, the model receives a typed error result naming the count, the denial does not consume the tool budget, and `tool:end` carries `outcome: 'denied'` with `guard: 'repeated-signature'`. `maxNoNewEvidenceCalls` aborts the invocation as status `limit` with the new `abortClass: 'exploration'` when N consecutive successful executions return only already-seen result digests; the executed work is kept, the terminal memoizes, and the structured `ExplorationSummary` (`toolCallsUsed`, `distinctSignatures`, `repeatedCalls`, `duplicateResultCalls`, `deniedRepeats`, `byTool`) journals beside the abort class so a replayed consumer sees the same typed evidence with zero live calls. Whenever any guard field is configured the summary also rides the full `AgentResult` and the live `agent:end` event (live-only for non-abort terminals, like `transportRetries`); values JCS cannot serialize fail open (unique signatures, fresh evidence); on resume the guard rebuilds from the restored checkpoint messages. The CLI TUI renders the guard marker on denied tool lines and the OTel exporter maps the counters to `rulvar.exploration.*` and `rulvar.tool.guard` attributes. Unconfigured invocations are byte-identical to before. Demonstrated against published 1.51.0 first: the identical call executed six of six times with zero signal, the model never saw a remaining count, duplicate pages never flagged, and the terminal was a bare `limit` indistinguishable from honest work.

### Patch Changes

- Updated dependencies [e138df9]
  - @rulvar/core@1.52.0

## 1.51.0

### Patch Changes

- @rulvar/core@1.51.0

## 1.50.0

### Minor Changes

- e39a885: The structured determinism contract (RV-209): bare-nondeterminism detection is engine-owned, classified, localized, and enforceable, and replay verification is a first-class CLI gate.

  - New `determinism:warning` event on the run stream: a bare `Date.now()` or `Math.random()` call observed inside an in-process workflow body emits `category`, `provenance` (`workflow` | `allowlisted`), the calling `frame`, and the parsed `file`/`line`/`column`, at most once per (category, provenance) per execution segment. Installed dependencies (node_modules) and Node runtime frames are classified exempt and stay silent, so an SDK's internal randomness never brands the run nondeterministic. Never journaled; because replay re-executes the body, a violation still in the code fires again on every replay organically.
  - `CreateEngineOptions.determinism`: `mode: 'off' | 'warn' | 'error'` (warn stays the default and the pre-RV-209 dev-only behavior; the process warnings now name the callsite), `allowlist` (substring or RegExp patterns for confirmed-safe frames, classified `allowlisted`, never rejected), and `redact` (applied to frames and file paths before they leave in events, warnings, and errors). Config is validated loudly at `createEngine`.
  - `mode: 'error'` detects in every environment including production and rejects the run: the offending call throws a typed `DeterminismError` (new error code `determinism`, localization in `data`) at the call site, and a workflow that swallows it is re-thrown at settle, so the run ends `'error'` instead of recording a value replay cannot reproduce.
  - The journaled run-settle decision now records `outputHash` (canonical JCS sha256 of the settling segment's result; absent for undefined or non-serializable values). Pure replays append no settle, so a divergent replayed result can never overwrite the live baseline. `hashRunOutput` and the extended `lastRunSettle` are exported.
  - New `rulvar replay <runId> [--args JSON] [--store PATH] [--assert-no-live] [--compare-output-hash]`: a dry-run resume (zero journal or meta writes, zero adapter calls) that reports replay accounting, every localized determinism warning, and the digest comparison; `--assert-no-live` exits 1 unless the replay is pure, `--compare-output-hash` exits 1 unless the replayed result's digest equals the journaled one. Deliberately no `--allow-args-change`: verifying a different logical run proves nothing.
  - The TUI renders `determinism:warning` lines, and the OTel exporter attaches the event to its span with `rulvar.determinism.*` plus `code.filepath`/`code.lineno` attributes.
  - The frozen cassette catalog is re-recorded for the additive `outputHash` field on run-settle decisions (journal-shape-revision, policy not identity: no hashVersion change, no matching impact).

### Patch Changes

- Updated dependencies [e39a885]
  - @rulvar/core@1.50.0

## 1.49.0

### Minor Changes

- bab7b2c: Make the agent event model unambiguous (RV-207): one `agent:start`/`agent:end` pair per logical agent span, a paired `agent:phase:start`/`agent:phase:end` per model invocation phase, an official reducer, and the OTel exporter leak the old shape caused is closed.

  Before this release one spanId emitted an extra unpaired `agent:start` for every phase of the dispatch (`loop`, then `summarize` per compaction, `finalize`, `extract`) with a single `agent:end`, so durations and attempts were underivable without heuristics: a consumer pairing starts with the end read the LAST phase's duration as the agent's, a starts-minus-ends gauge leaked one running agent per phase, and the shipped `toOtel` exporter (reproduced on the published 1.48.0) leaked a never-ended OTel span per multi-phase agent while the span it did close measured only the last phase. The replayed stream had a different shape than the live one (one start), so the same consumer built different tables live and on replay.

  Now every phase activation emits `agent:phase:start`/`agent:phase:end` keyed `(spanId, invocation)` (a 1-based activation ordinal; a summarize that fires three times gets three pairs), carrying the phase's role, the serving model, `durationMs`, the usage delta the activation added to its `(role, model)` slice (the pairs sum exactly to `agent:end` and to the journaled `usageByModel` split), `costUsd` priced at each serving model's own rate, a binary `outcome`, and `retries` (transport retries inside the activation). `agent:end` gains `retryCount`. The retry facts are live telemetry only, never journaled: replayed events omit them, and replayed phase pairs are reconstructed from the terminal entry's recorded slices with `durationMs` 0, so a live stream and its replay reduce to IDENTICAL usage and cost tables. `reduceInvocationTable` (new in `@rulvar/core`) is the official no-heuristics reducer: per-agent per-phase rows plus a per-role aggregate that matches `CostReport.byRole`; truncated streams stay honest (`open: true`), never guessed at.

  `@rulvar/cli`: `toOtel` maps each phase pair to an `invocation <role>` child span of its agent span with `gen_ai.usage.*`, `rulvar.cost_usd`, and `rulvar.retries` attributes, closes the agent span with the whole dispatch's totals and `rulvar.retry_count`, and an opener for an already-open span never duplicates it, so even a stream from a pre-RV-207 core cannot overwrite the tracked agent span and leak it unended. The progress renderer prints the phase lines (`agent w extract phase on model`, then the settle line with per-phase cost, tokens, duration, and retries). Journal bytes, cassettes, and toolset hashes are untouched: events are telemetry, never identity.

### Patch Changes

- Updated dependencies [bab7b2c]
  - @rulvar/core@1.49.0

## 1.48.0

### Patch Changes

- @rulvar/core@1.48.0

## 1.47.0

### Minor Changes

- a3687fe: Ship phase 3 of the fenced run state RFC, reconcile and recover. The engine now journals every run settle whose segment did durable work (or changed the recorded status) as a `run_settle` decision entry ordered BEFORE the meta write, so the run's outcome is part of the journal and `RunMeta` is a rebuildable projection; the write-on-change rule keeps pure replay byte stable, so a resume that only replays appends nothing. On top of it, `auditRun` names the divergences a worker sweep can never see, `auditRuns` sweeps the catalog, and `reconcileRunMeta` rewrites the sound cases from the journal with zero model calls and no workflow: `meta-behind` (the crash residue between the journal flush and the meta write, or a stale write contradicted by a journaled settle) takes the journaled status, and `stranded` (a terminal meta over live journal work, the F1 residue an unfenced store admits, demonstrated against the published 1.46.0 first) becomes sweepable again; ambiguous residues are reported as `suspect` and never rewritten. The CLI gains `rulvar runs audit [--repair]`, the operator probe: it lists every divergence, repairs under a brief per-run lease on a leasable store (a live owner is skipped, never raced), and exits 0 only when the catalog ends consistent. `ResolutionOutcome` additionally carries `woke: true` exactly when a resolution settled a live in-process waiter, and the HTTP server uses it to close a quiesce-window race: a resolve that applied through the fold while the segment was closing now awaits the imminent settle and continues the run in place instead of answering `resumed: false` on timing grounds and stranding it suspended. The committed cassette catalog is re-frozen for the additive settle entry under the journal-shape-revision lane of the fixtures lock: an additive journal evolution that revises no identity (the hashVersion stays 2; entry identity, adapter requests, and the frozen v1 resume fixtures are untouched byte for byte).

### Patch Changes

- Updated dependencies [a3687fe]
  - @rulvar/core@1.47.0

## 1.46.0

### Patch Changes

- Updated dependencies [865e7bf]
  - @rulvar/core@1.46.0

## 1.45.0

### Minor Changes

- b96305d: The fenced writes capability (the fenced run state RFC, phase 2). `JournalStore.putMeta` and `delete` and `TranscriptStore.put` and `delete` accept the same optional trailing lease that `append` always took, and a store declares enforcement with the `fencedWrites: true` marker: a mutation carrying a lease that is not the current holder for the mutated run rejects with the typed `LeaseHeldError`, atomically and leaving nothing changed, including a live lease for a different run. The engine threads the segment's lease into every durable mutation of a leased resume (meta writes, checkpoints, compaction summaries, worktree patches, workflow sources), so over a declaring store a superseded worker can no longer overwrite the successor's meta at its late settle and strand the run from worker sweeps, and its very first refused meta write now fails the stale segment typed at boot with zero paid calls. `SqliteStore` declares the marker and enforces it on `putMeta`, `delete`, and `append` (with the run-match rule as defense in depth); the conformance kit gains `fencedWritesConformance` as the capability's executable definition; the queue worker's retention sweep passes its brief lease through the new optional second argument of `engine.deleteRun` (`pruneRun` takes the same); and `hasFencedWrites` plus `assertFencedWrites` let a host assert the full fence at deployment time. Stores written before the capability are untouched: without the marker the extra argument is ignored and the journal-append fence works exactly as before.

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

### Minor Changes

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

### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

## 1.40.0

### Minor Changes

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

### Minor Changes

- 101795b: Validate `createWorker` timers and make the TTL match promise executable (v1.35.0 review P2). `ttlMs` and `pollMs` must be integers between 1 and 2147483647 ms, refused typed at construction (an overflow or non finite cadence collapsed to the 1 ms interval floor and stormed the store). A store exposing the optional `leaseTtlMs` capability is verified against the worker ttl, a mismatch is a `ConfigError`, and an omitted `ttlMs` adopts the store's value.

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

- @rulvar/core@1.31.0

## 1.30.0

### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

## 1.29.0

### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

## 1.28.0

### Minor Changes

- d98eb0b: The documented spaced syntax of numeric flags now reaches the canonical validation for negative values: `rulvar run wf --budget-usd -1` reports `--budget-usd must be a positive number` instead of the generic parseArgs ambiguity error (v1.27.0 review P3). The fold applies only to strictly numeric negative tokens after a numeric flag (`--budget-usd`, `--planning-budget-usd`); unknown option, duplicate flag, and missing value diagnostics are unchanged.

### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

## 1.27.0

### Minor Changes

- 884a433: The HTTP shell's SSE delivery is now complete and bounded per connection (v1.26.0 deep E2E review). A terminal settle closes connected streams only AFTER the segment's event pump has drained, so a client that keeps reading receives the full tail including the terminal `run:end` instead of a clean close that silently swallowed the backlog; when the pump itself failed, the close is preceded by an SSE comment saying the stream may be incomplete. New `maxPendingEventsPerClient` option (default 10000) bounds what any single SSE connection can accumulate unread, independently of the replay buffer: a consumer that stopped reading is unhooked at the bound and closed with an SSE comment naming it, the frames already queued stay readable, and the standard `Last-Event-ID` reconnect resumes strictly after the last frame the client consumed; a replay longer than the bound is delivered the same way, in bounded chunks across reconnects, so pending memory per connection is O(bound) while delivery stays at least once. `createServer` now validates its numeric caps at construction with a typed `ConfigError` (`maxTrackedRuns` accepts non negative safe integers, `maxBufferedEventsPerRun` and `maxPendingEventsPerClient` accept positive safe integers): `NaN` used to silently mean unbounded, `Infinity` looked like a cap without capping, and negative or fractional values produced policies nobody asked for. The barrel additionally exports `DEFAULT_MAX_PENDING_EVENTS_PER_CLIENT` and the referenced types `KbSweepCliConfig`, `LoadedWorkflowModule`, and `OtelContextApi`, so every public signature resolves in the API docs.

### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

## 1.26.0

### Minor Changes

- a4fc757: The HTTP shell decouples process memory from durable retention (v1.25.0 scale review): new `memoryRetention` predicate and `maxTrackedRuns` cap release a settled run's tracked state (args, outcome, handle, SSE buffer) while the journal and transcripts stay, and new `maxBufferedEventsPerRun` bounds each run's SSE replay buffer (oldest events dropped in chunks and counted; a replay that lost events carries an `x-rulvar-events-dropped` header, and a client whose cursor predates the retained window gets a leading SSE comment naming the first retained seq). The `Last-Event-ID` cursor is now a binary search over the seq ordered buffer and the replay streams by index (no buffer copy); a cursor seq the buffer does not hold replays everything strictly after it instead of re-flooding the whole buffer, which remains at least once. The queue worker sweeps candidates only (`listRuns({ statuses: ['running', 'suspended'] })`, widened to the full catalog only when durable `retention` needs terminal metas), never overlaps sweeps, keys its suspended skip cache and its poison set to the run's generation (`RunMeta.genesis`) so a `deleteRun` and recreate of the same runId is picked instead of skipped, and drops skip and poison entries for runIds that left the candidate set. Point lookups in `resume`, `inspect`, the kb gate, and the server status path go through the store's exact lookup capability when present.

### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

## 1.25.0

### Patch Changes

- 74851ed: CLI diagnostics stop echoing `--args` values and sanitize every dynamic value they embed. The invalid-JSON and non-canonical-JSON refusals now name the failure class and the way out without repeating the supplied value (workflow args may carry private data, and stderr routinely lands in CI logs). Every typed CLI error prints through one site that strips terminal control sequences, and the plain-output run renderers (outcome reports, dry-run previews, suspension prompts, resume warnings, plan lint diagnostics) sanitize untrusted text the same way the live TUI already does, so a hostile runId, suspension key, provider error message, or model ref cannot recolor, retitle, or rewrite the terminal. Exit semantics are unchanged.
  - @rulvar/core@1.25.0

## 1.24.1

### Patch Changes

- 0bb14db: Close a resume args-gate bypass through JSON numeric overflow (v1.24.0 review P2-1). A `--args` value that overflowed JavaScript's finite range (`1e400` parses to `Infinity`) could not be canonicalized, so genesis recorded the args binding with `argsProvided` but no hash, and a later `resume` supplying entirely different args slipped past the gate with only a warning, silently changing the logical run and re-paying every args-dependent call. `rulvar run` and `rulvar resume` now reject non-finite (non-JCS) `--args` at parse time, before any config, store, or adapter loads. Independently, when a run recorded `argsProvided` without a verifiable hash (an in-process host that started it with genuinely non-JCS args), a `resume` supplying args is now a typed refusal unless you pass `--allow-args-change`, instead of the previous soft warning. Core engine policy is unchanged: in-process hosts may still pass non-JCS args and record presence without a hash.
- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

## 1.24.0

### Minor Changes

- 2b033e8: Make `rulvar resume` safe against forgotten or changed args and add a `--dry-run` preview (the v1.23.0 review: a resume without `--args` silently changed the logical run and paid again). The resume grammar gains `--dry-run` and `--allow-args-change`. Before the engine starts, the CLI verifies the supplied args against the genesis binding recorded in `RunMeta`: forgetting `--args` on a run started with them, adding them to a run started without them, or supplying a different value is a typed refusal naming `--allow-args-change` as the deliberate override; runs recorded before v1.24.0 carry no binding and demand explicit `--args` or the override. `--dry-run` passes the engine's replay-strict mode through and prints the resume preview (hits, misses, reruns, skipped, orphaned effect roots, invalid resolutions) plus what the run would settle as, with zero journal or meta writes and zero adapter calls; a preview that reaches work needing a live call reports the stopping point and exits 0. `rulvar inspect` now prints the args binding.

### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

## 1.23.0

### Patch Changes

- 1f9c272: The renderers' remaining unsanitized paths and the malformed-event gaps (v1.22.0 review P2-2, P2-3).

  - `progress()`: the error text surfaced when the SOURCE fails (a rejected `RunHandle.result`, a rejected `Promise<RunHandle>`, a throwing iterable) went to the sink raw; a crafted rejection could inject ANSI, forge lines, and leak a key-shaped fragment. Every catch path now routes through one helper that secret-masks FIRST (the thrown value never crossed the event masking boundary) and terminal-sanitizes second; lines mode prints the notice as its own sanitized line instead of dropping it.
  - Malformed recognized events from a raw iterable can no longer stop a view: every dynamic field in the `progress()` reducer, its lines formatter, `renderProgress`, and the CLI `renderEventLine` is read through typed guards (a hostile object with a throwing `toString` included), a backstop catch skips a bad event with a bounded diagnostic carrying no untrusted data, and the stream continues. The v1.22.0 claim of full defensive reads was narrower in reality (`agent:stream` without `delta` or `phase:start` without `phase` stopped the raw-iterable view); it is true now and pinned by a table-driven test over every consumed type.
  - `posIntOption` wording: a below-minimum value CLAMPS to the minimum (only non-finite values fall back to the default); the JSDoc said "falls back" for both.
  - `@rulvar/cli` build config migrates the deprecated tsdown `external` option to `deps.neverBundle`; the packed dist keeps the companion specifiers external, byte-for-same behavior.

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

## 1.22.0

### Patch Changes

- 77b554f: Sanitize the CLI event line renderer (`renderEventLine`, used by `attachProgress`): every composed line passes through the shared `sanitizeTerminalText` before it reaches the terminal, so an untrusted provider/tool/log string in an event can no longer inject a control sequence or a second physical line into CLI output (v1.21.0 review P2-1). Clean lines stay byte-identical.
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

### Minor Changes

- 943962d: Sweep and suite reports are now monotone: paid evidence survives every budget refusal. Previously `runSweepMatrix` caught the envelope's `SweepBudgetError` around a whole cell and replaced it with an empty `envelopeExhausted` row, erasing already completed targets and their cost; a judge refused by the envelope erased the paid successful target the same way; and a judge run that hit its own per-run ceiling threw `EvalJudgeError` out of the entire matrix, losing every accumulated cell.

  Now: `runEvalSuite` returns partial results with `plannedN`, `completedN`, and a typed `refusal` marker instead of throwing when the envelope refuses a target; a judge budget event (per-run ceiling exhaustion or envelope refusal) normalizes into the owning `EvalCaseResult` as `incomplete: { reason: 'judge-exhausted' | 'judge-refused' }` with the failing judge run's actual cost counted, while non-budget grader errors still throw; `SweepCellReport` gains `plannedN`, `judgeIncompleteRuns`, `incompleteReason`, and `refusedRunLabel`, and any incomplete cell (n < plannedN, exhausted targets, unfinished judges, or an envelope refusal) emits no claim; `runCanary` records an envelope-refused probe as `status: 'refused'` and keeps walking, so completed probe evidence survives and `allOk` stays the drift-flip gate; `EvalJudgeError` carries `costUsd`. The `kb sweep` human renderer prints incomplete cells explicitly (`INCOMPLETE: envelope refused ... after N of M case(s)`, unfinished-judge counts, refused-probe counts) instead of pretending nothing ran.

  Migration: `runSweepMatrix` and `runEvalSuite` no longer throw `SweepBudgetError` for refused targets or judges; read `EvalSuiteResult.refusal`, `EvalCaseResult.incomplete`, and the new cell fields instead. Cells now always carry `plannedN`.

### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

## 1.17.0

### Minor Changes

- 7909b6b: Every paid CLI surface is now budget-bounded, and the grammar ignores nothing (the v1.16.2 review P1-1, P1-2, P2-1, P3-1).

  - `rulvar plan` gained separate immutable ceilings for its two paid runs: `--planning-budget-usd N` freezes as the planning run's B0 at its journal's genesis (`PlanOptions.run.budgetUsd`) and `--budget-usd N` caps the execution run exactly like `rulvar run`. A machine-written workflow never runs unbounded silently: missing ceilings fail loudly unless `--allow-unbounded` waives them explicitly, and `--dry-run` beside `--budget-usd` is a contradiction, not an ignorable leftover.
  - `rulvar kb sweep` requires `kbSweep.budgets` (`{ targetUsd, judgeUsd, canaryUsd, maxTotalUsd }`) or an explicit `kbSweep.allowUnbounded: true`: every target, judge, and canary run carries an immutable per-run ceiling, the whole sweep authorizes against the debit-only `maxTotalUsd` envelope (falsification pool growth included), the worst-case authorized spend prints before the first provider call, and envelope-refused or ceiling-exhausted cells report honestly and emit no claim. Canary drift flips claims stale only when every probe settled `ok`, so a budget-starved or transiently failing probe can never blame the model.
  - The canonical grammar is one data structure now: `--help`, every per-command usage error, and the documented grammar block render from it and are locked together by tests. Nothing accepted is ignored: `resume` rejects `--budget-usd` and `--profile` at parse time (the ceiling is immutable from genesis by the documented budget invariant), every command enforces exact positional arity, duplicate value flags fail, and unknown options report as ConfigError usage lines instead of raw parseArgs stack traces. All rejections happen before any config, store, or adapter loads, with zero provider calls and byte-identical journals.

### Patch Changes

- @rulvar/core@1.17.0

## 1.16.2

### Patch Changes

- 9f07130: The published CLI now actually loads its command-local optional companions. The build had been inlining `@rulvar/planner`, `@rulvar/plan`, and `@rulvar/evals` into local chunks, so the packed `rulvar plan` failed with a false "install @rulvar/planner" even with the planner installed (the inlined eslint broke at load time and a bare catch reported it as missing), while `rulvar kb inbox` ran without `@rulvar/plan` installed, against the documented dependency contract. The three companions are external again (dist keeps the real `import("@rulvar/...")` specifiers, the planner's worker sandbox loads from the installed package, and the CLI dist shrinks from megabytes to about 82 kB), and import failures are classified: only a genuine module-not-found for the requested companion produces the install hint, while an installed companion that fails to initialize surfaces its own error with the cause preserved. A packed-consumer E2E matrix (`scripts/cli-smoke.mjs`) now gates releases on exactly this behavior.
  - @rulvar/core@1.16.2

## 1.16.1

### Patch Changes

- fac1ecc: Mark eslint's optional TypeScript-config loader `jiti` as external in the CLI bundle. The bundled eslint (pulled in through @rulvar/planner's programmatic `Linter`) lazily imports `jiti` only on its config-file loading path, which the CLI never executes; the import now stays an import instead of producing UNRESOLVED_IMPORT build warnings. No runtime behavior change.
  - @rulvar/core@1.16.1

## 1.16.0

### Patch Changes

- @rulvar/core@1.16.0

## 1.15.0

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

### Minor Changes

- 969974f: rulvar kb inbox (M12-T03): aggregates kb_propose-born proposals from finished runs through the RunLedger fold behind the LedgerExport seam. Matching (subject, taskClass, polarity) triples group for display ONLY (the command writes nothing, authorizes no spend and schedules no sweeps); each proposal renders with full provenance (initiating run identity, proposal entryRef, lineage, tier, trigger, evidence refs) plus the typed template statement a gated claim would carry; proposals of runs finished more than fourteen days ago expire out of the view. This is the human review surface, so the quarantined note and concrete model names render here verbatim, exactly like kb list.
- 64aff88: rulvar kb gate (M12-T04, the closing task of ModelKnowledge phase 3): the human gate flow turning one inbox proposal into a human-editorial claim. The attribution attestation is mandatory by construction (without --ruled-out over the closed checklist the GateRecord does not assemble and nothing is written; contrast evidence rides --contrast-run or --contrast-eval); the born claim carries the typed template statement (never the quarantined note), origin provenance back to the proposing run and entry, evidence resolving into that run's journal, and the editorial TTL. The commit is CAS against the per-project rulvar.models.json, whose git review is the authenticating gate. Non-proposal entries, expired proposals (fourteen days from the run's terminal updatedAt), running runs and already-gated proposals reject with typed errors.

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

- 93eae2c: M10-T04: `rulvar kb list` (docs/05, section "Read path"; docs/06, section 10.5). The second consumption path: claims of the per-project store (./rulvar.models.json) render with full provenance for the humans who author ladders, floors, and profiles: author and gate identity, evidence refs (journal seqs and eval reports), metrics when present, supersede chains, proposal origin, and the TTL state (holds or EXPIRED) per the docs/05 decay table. No run and no pin are involved, so the maintenance view names models verbatim; only in-run cards are nameless. The grammar members `kb inbox` (phase 3, M12) and `kb sweep` (phase 2, M11) fail loudly naming their phases until they ship.
- fef6263: M11-T05: `rulvar kb sweep` (docs/05, section "Grounding and decay"). Falsification sweeps run manually, from CI, or from a user cron, never engine-scheduled, configured by the `kbSweep` section of rulvar.config.mjs (committerId, the FIXED model pool, taskClass-tagged eval cases, optional thresholds and canary probes; @rulvar/evals loads dynamically like @rulvar/planner does for plan).

  - The falsification guarantee: the matrix is the configured pool UNIONED with every model carrying an active, unexpired negative claim, plus the re-measurement queue (expired active eval claims); the pool renders with each member's origin.
  - With canary probes configured, every pool member fingerprints BEFORE measurement and drift flips its eval claims to stale in place; the sweep then re-measures and commits threshold-crossing claims through the eval-committer identity, reporting cells, emitted claims, and the committed store version.

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

- 9f000a7: Drop the @rulvar/planner peer declaration from the CLI: the plan command loads the planner DYNAMICALLY and reports a clear error when it is not installed, and a workspace peer dependency would major-cascade the whole fixed group on every planner bump under the changesets peer-dependents rule (0.6.0 would have released as 1.0.0 instead of 0.7.0).
- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

## 0.6.0

### Minor Changes

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
    `rulvar runs ls [--store PATH]`, `rulvar inspect <runId> [--store
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

### Patch Changes

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

## 0.5.0

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
