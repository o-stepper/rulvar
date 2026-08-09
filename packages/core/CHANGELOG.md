# @rulvar/core

## 1.224.0

### Minor Changes

- 4eca1a3: The resume-time budget override (RV2208). A run that died against its own `budgetUsd` was unfinishable by doctrine: the RunMeta-recorded ceiling governed every later segment, `ResumeOptions` deliberately carried no budget field, and the only way forward re-paid the whole journaled prefix as a fresh run. `ResumeOptions.run` (`{ budgetUsd?, maxInFlightExposureUsd? }`) is the one explicit door: each value is validated exactly like its `RunOptions` counterpart, applies to the resumed segment and the run's remaining life, and is recorded back by the segment's first meta write, so a LATER bare resume restores the overridden posture rather than the genesis one. The change is never silent: before the meta mirror flips, the segment journals a `run_budget_override` decision naming the recorded value, the applied value, the source, and the settled spend it was judged against (`null` records a run that started uncapped). A `budgetUsd` below the journal's settled spend refuses with a typed `ConfigError` before ownership, meta, or any append: such a ceiling would exhaust the segment before its first turn and read like a fresh money death. Absent fields keep the recorded values, an absent object keeps the historical behavior byte for byte, and `strictPricing` deliberately stays out of the override: pricing hygiene is not a per-segment decision.

## 1.223.0

### Minor Changes

- 549aabd: The bare root ceiling folds documented (RV2205). A coordination turn refused by the RUN account's own hard crossing was the last undocumented money death of the loop: the exposure and reserve-line arms fold typed (RV1902, RV2101), but a crossing that named the run root itself, whether the ctx boundary re-mint (`source: 'root'`, a crossing detected at or after execution: the first parity run's shape, B0 drained by children while the root sat at 16% of its cap) or a pre-admission refusal of the coordinator's own seat (`account: 'run'`), rethrew bare and tore the run down around its settled children. Both shapes now fold through the SAME forced-finish machinery: the journaled `orchestrator_finalize_fallback` decision gains reason `'budget-ceiling'` beside `'budget-floor'` and `'exposure-abort'`, the settled children ride the partial envelope, and the synthesis redemption stays free to try: past a crossed run ceiling its spawn admission declines with the arithmetic and journals the declined verdict (RV2102), which is the honest record, not a special case; with nothing settled the redemption arm correctly stays out. Orchestrator-cap crossings keep their dedicated atCap machinery, and unrecognized budget shapes still rethrow.
- 549aabd: The unfunded repair grant declines typed (RV2207). Validation can grant a repair the budget will never execute: the seventh parity run's synthesis died between a granted repair verdict and its dispatch, and even with the refusal's message riding the terminal (RV2104) the death stayed a generic budget re-mint with no journal record of the grant the money never covered. The agent loop now marks exactly that refusal (a would-be turn following a rejected terminal-tool exchange carries `the granted repair turn could not be funded:` in front of the crossed-account arithmetic), the coordination path reads the marked terminal behind the re-mint's `entryRef` (the RV2103 pattern), journals `orchestrator_repair_grant_declined` with the reason, the terminal reference, and the remainder, and fails the run as a TYPED validation failure (`FailRunError: the orchestrator finish could not complete its granted repair`) instead of the generic budget error; on the synthesis path the redemption's declined verdict repeats the same marked message through its terminal read, so both repair surfaces tell one story.

## 1.222.0

### Minor Changes

- 8326268: Counted section collections join the finish contract (RV2206). The parity contract demands numbered collections (48 `N01.`-style negative scenarios, 16 `C01.` counterexamples), and nothing enforced them: the second accepted subscription dossier carried 0 and 0 against a synthesis instruction naming both, and only a runner-side format pre-teach closed the gap, by hope rather than contract, while citations enjoyed per-section validation since v1.71. `finishContract` grows `sectionPatterns`: per entry, at least `min` matches of a regex INSIDE a named section's slice, DISTINCT by first capture when the pattern captures (a repeated id counts once), with literal `samples` embedded in the golden fixtures and quoted by the prompt statement (with a capturing pattern the samples must carry `min` distinct captures, because the accept skeleton must satisfy the demand it embeds, and a boundary-sharp reject golden drops exactly one sample line). The standalone validator is `sectionPatternCountValidator` (`contract-section-patterns` inside the bundle); a deficit reason names the section, the label, the found-against-required count, and how many are missing, so a repair turn knows exactly what to add. Absent the field, the manifest normalizes, hashes, and behaves byte-identically.

## 1.221.0

### Minor Changes

- 032ce93: The exposure drain grants a mid-work seat one clamped finalization turn (RV2204). The third parity rerun killed three workers ~30 turns into research with evidence pools of 17 and 22 under a floor of 24 and a CONFIGURED finalization window: the drain came before the window, and the window's play needs the very wire the drain refuses, because a drained seat's next ordinary turn re-prices the whole per-turn allowance the pool just refused. With `limits.finalizationReserve.maxOutputTokens` declared, a drained seat that already completed a turn now spends ONE finalization turn before its typed `exposure-drained` terminal: the output clamp shrinks the turn's exposure estimate to the summary allowance, the `finalizationWindow.allow` list rides as the turn's only tools so outstanding `record_evidence` calls land in parallel through the ordinary tool machinery, and the drain instruction is request-only, mirroring the tool-budget reserve turn. Best effort on every edge: a refusal of even the clamped estimate warns and keeps the typed terminal, and a seat with NO completed turns keeps dying at zero provider attempts (the RV2002 doctrine, pinned). Preflight learns the funding truth: `drained-finalization-unfunded` (info) names a window declared under an in-flight exposure cap with no reserve to fund the grant, and `inert-finalization-reserve` stops warning when the exposure cap alone gives the reserve a trip path.

## 1.220.0

### Minor Changes

- 0babe70: The failure envelope carries the pass truth (RV2203). Two live terminals hid facts their journals held: the RV2106 mirror run's error terminal read `claimConsistencyMeta: null` over a journaled declined-judge verdict, and the seventh subscription parity resume settled exhausted with `completion: null` and `childStatusCounts: null` over a journaled accepted acceptance with four ok children, because the exhausted path lifted only from the partial value and the raw `BudgetExhaustedError` carried nothing. Three fixes: the orchestrator enriches every synthesis-path failure with the acceptance snapshot, the claim-consistency meta, and the `{ran, reason}` pass summaries (the budget class is preserved, so `exhausted` stays `exhausted`, and the ok envelope and the failure enrichment now build their summaries with one shared builder whose synthesis arm reads `synthesis-failed` on the failure path); the run-completion lift falls back to the enriched error data on the exhausted path; and the lift itself (with `run:end` and `RunOutcome`) grows `claimConsistencyMeta` and `synthesisSkipped` under the established mirror posture, valid shapes mirrored, malformed shapes silently absent, on every terminal, ok and failed alike.

## 1.219.0

### Minor Changes

- 65a4ce7: The evidence-grade repair guidance is composition-safe (RV2202). The RV2106 mirror run reached the synthesis finish and lost the run to two individually correct validators: evidence-grade demanded "name a run id or a file:line citation beside it", the synthesis obeyed literally and wove inline run ids into sentences that already carried source citations, and cited-value then rejected exactly those sentences, because a run id is never in the cited window; the model sat between the two verdicts and both granted repairs burned ($5.31 with no dossier, after an accepted acceptance and a typed judge degradation). A validator reason is a repair instruction, so it must be executable without violating any sibling in the bundle: the verdict now steers to the safe shape (a file:line citation in the claim's own sentence, or the run id in a SEPARATE sentence carrying no source citation, with the trade named explicitly), the pairwise rule is documented for validator authors beside the audited built-in bundle, and the regression suite pins the guided shape passing evidence-grade AND cited-value together while the trap shape keeps failing exactly one of them. The reason text is API for repair prompts; hosts matching the old bytes must update.

## 1.218.0

### Minor Changes

- 088bda6: The lifetime spawn counter survives resume, the accepted-finish synthesis decline journals its verdict, and preflight prices the tail's spawn budget (RV2201). The seventh subscription parity run was killed mid-fan-out and resumed: the resumed segment seeded the counter from the journal fold (5 agents) and the roll-forward of the four journaled child admissions incremented it AGAIN, so the post-acceptance tail starved at 9 against a cap of 8 with its money whole: the claim judge declined typed (the RV2106 catch holds for non-monetary refusals), and the synthesis spawn refusal reached the terminal as a bare message with no decision entry while its 1.40 reserve sat intact. Three fixes: `admitRecovered` no longer increments the lifetime counter, so each spawned agent counts a single time across the run's whole life, never twice (at its fresh admission, or through the seed of whichever segment rolls it forward), and the c7 kill-and-resume shape now seats its judge and synthesis; a synthesis admission refused after the validated coordination finish journals `orchestrator_synthesis_redemption_declined` with the refusal's reason, the remainder, the live `spawnHeadroom`, and `path: 'accepted-finish'`, the same verdict the redemption path writes, so a journal reader asks one question either way; and preflight grows `tail-spawn-budget` (the declared wave rows are already denied row by row against the cap, but the claim judge and the synthesis spawn after the fan-out and no row priced them) plus the `orchestrator.headroomTurns` knob for the previously hardwired `reserve-line-headroom` threshold (default 2, 0 silences the fence). journal-shape-revision: `statsBefore.spawnsBefore` embedded in post-resume admission decisions now reflects the once-per-life count (the crash-during-revision and config-drift-resume cassettes re-recorded with exactly that one value changed); already-journaled entries replay verbatim, so existing journals stay valid.

## 1.217.0

### Minor Changes

- ab80b97: The declined judge admission degrades typed, the refusal names its holds, and preflight prices the working room (RV2106). The ninth parity run finished its whole fan-out (four ok children, a composed and accepted draft) and then died bare: the claim-consistency judge's 0.28 admission estimate did not fit the orchestrator account's working room past the held 1.40 synthesis reserve, the pre-dispatch refusal flew out of the coordination uncaught, and the run settled exhausted with no fold and the funded synthesis never dispatched, while the refusal message printed arithmetic that fit with room to spare because the hold was in the sum and not in the text. Three fixes: the declined judge admission journals `orchestrator_claim_judge_declined` with the refusal text and the post-refusal remainder, the meta carries `judgeDeclined: true` beside the `judgeFailed` precedent, the synthesis still runs, and only the armed `'fail'` posture stops the run; the admission refusal message gains a `plus the held synthesis reserve N USD` clause exactly when a hold exists (hold-free refusals keep their bytes) with `synthesisReserveUsd` and `finalizeReserveUsd` stamped on the error data; and preflight grows `orchestrator-working-room`, judging `effectiveCap - synthesisReserveUsd` against one coordination turn floor plus the newly declarable `orchestrator.claimConsistency.judge.estCost`.

## 1.216.0

### Minor Changes

- b357f4a: The evidence-grade verdict names its offending sentences (RV2105). The eighth parity run's synthesis was told `evidence-grade claims cite no run or repro artifact in their own sentence: live-observed` over a 5000-word document, repaired blind twice (the second repair fixed `production-proven` and never found the `live-observed` sentences), and the run failed closed with half its budget unspent. `evidenceGradeValidator` reasons now carry the offending sentences verbatim beside the phrase list, bounded to five and truncated per sentence (whitespace-normalized), with an `and N more offending sentences` tail, so a granted repair turn reads exactly the lines the verdict judged. The blindness audit covered every other finish validator: each already names its material (sections, headings, fields, citations, missing pool items, codepoints with context), so the fix is exactly one validator wide.

## 1.215.0

### Minor Changes

- e1da4c7: The refused turn's message rides the terminal, and the synthesis reserve is priced against its own composition (RV2104). The seventh parity run's synthesis composed to its 40000-token output allowance, failed the section validator on the truncation, was granted a repair, and the repair turn was refused at the crossed ceiling; the terminal journaled a bare `agent terminated with status error` because every `beforeTurn` catch discarded the refusal's text, and the RV2103 declined verdict repeated it. The pre-dispatch ceiling guard's own message, naming the crossed account and the spent-of-ceiling arithmetic, now rides the agent terminal from all five refusal sites (the loop turn, summarize, finalize, extract, and the finalization-reserve skip's warn log), so the ctx terminal entry and the redemption's declined verdict tell the refusal's truth. Preflight grows `synthesis-reserve-below-cap-composition`: the minimal-payload check prices the shortest accepting finish, but a reasoning model writes to its allowance, so the finding prices one allowance-sized turn (plus the declared input floor) and one more when the validation declares a repair reserve, and warns when the committed `budget.synthesisReserveUsd` is smaller; the seventh run's 0.70 hold funded a composition it could not repair.

## 1.214.0

### Minor Changes

- c8af0ec: The declined verdict tells the terminal's truth, and a severed synthesis is retried once (RV2103). The sixth parity run's synthesis dispatched for the first time in six runs (the RV2102 drain worked by the book) and died as `stream idle for 240000ms` with $0.9077 still uncommitted; the declined verdict then journaled the ctx boundary's generic `run budget ceiling reached` because the exhausted flag is armed at the fallback by design. The declined reason now reads the terminal entry behind the re-mint's `data.entryRef` and carries the message that actually ended the attempt, with `terminalRef` naming the entry and `transportRetries` counting the second wire; a refusal thrown before dispatch keeps its own admission arithmetic. A synthesis attempt severed on the wire (a transport-class terminal marked retryable, past the loop's own wire retries) is granted at most one retry from the same remainder: the journaled `orchestrator_synthesis_redemption_retry` decision keeps the second attempt auditable, and an unaffordable retry declines through spawn admission instead of dispatching.

## 1.213.0

### Minor Changes

- 61680df: The redemption drains the stragglers first (RV2102). The fifth parity pair reached the RV2101 redemption twice and lost the synthesis to the same next layer both times: a still-running child's committed admission reserve pushed the synthesis spawn past the ceiling (`spent ~5.0 + straggler reserve 0.66 + est 0.78 > 6.00`), the refusal lived only in a swallowed throw, and the straggler's post-boundary finalize burned 148k input tokens before teardown cancelled it. At the reserve line every remaining child faces the same refused arithmetic, so the redemption now aborts and awaits every unsettled child BEFORE the synthesis dispatch: their reserves release at their terminals, no NEW wire dispatches past the boundary, and a severed in-flight stream bills as the documented layer-3 overshoot. A redemption that still cannot fund the synthesis journals its verdict instead of folding silently: the `orchestrator_synthesis_redemption_declined` decision carries the refusal text, the post-release remainder, and the drained-straggler count. With the drain in place both fifth-pair runs would have funded their synthesis from the freed remainder.

## 1.212.0

### Minor Changes

- e6f8516: The reserve line is a boundary, not a death (RV2101). The third and fourth parity runs died on the two denominators the settle-time reserves sat in: the third at spent $4.7064 plus the $1.00 synthesis reserve against the 5.70 in-flight exposure cap (drain cascade with zero live estimates), the fourth at spent $5.065 against `ceiling - reserve = 5.00` (the root refused one output token, the intact $1.00 reserve unreachable, no synthesis). Three fixes, one doctrine: money promised to the tail is fenced by the budget chain alone, and reaching its line runs the tail instead of killing the run. The in-flight exposure admission now counts `spent + live estimates` only (the finalize and synthesis reserves left the sum; the budget chain already fences them). The coordination loop's typed `output-floor` refusal (a new `AgentError.reason` beside `exposure-drained`, preserved across the ctx boundary like the in-flight marker) now settles the documented forced-finish partial with the journaled fallback decision (reason `budget-floor` beside `exposure-abort`), and when a synthesis step is configured with its reserve still committed and at least one settled child, the synthesis promise is REDEEMED: the ordinary synthesis invocation runs from the released reserve with no coordination draft and its contracted output rides the partial envelope as `result`. Preflight prices the budget-side trajectory beside the re-priced exposure floor: `admission.reserveLineUsd` and `admission.reserveLineHeadroomUsd`, with the `reserve-line-headroom` warning when the admitted wave's steady state sits within two coordination turn floors of the line, and `exposure.requiredMinimumExposureUsd` drops the tail reserves in lockstep with the live formula.

## 1.211.0

### Patch Changes

- d5a8a36: The third parity rerun's crash shapes become permanent fault-kit gates (RV2009), zero paid calls. `parity-quiescence-deadlock` drives the exact terminal shape in miniature: the coordination turn eats the exposure cap, every worker is refused DRAINED (typed `exposure-drained`, zero provider attempts, RV2001/RV2002), the root forced-finishes partial (RV1902), and the gate asserts the exhausted terminal, the closed roster, `run_settle` after every agent entry, one wire denominator, and no unsettled invoice lane (RV2003/RV2008); any revert reads matched:false. `parity-sequential-roster-floor` drives the seat-by-seat roster under an unreachable acceptance floor and asserts the FIRST seat's typed `roster_floor` refusal with the whole-roster arithmetic journaled and zero paid children (RV2005). The docs truth pass lands the no-silent-exit invariant in the README and the design principles (no path ends the process while a run has no journaled terminal) and extends the observability denominator map with the RV2008 incremental lane and its settled boundary.

## 1.210.0

### Minor Changes

- c871ddc: Incremental billing journaling (RV2008). ProviderCallRecords rode ONLY the terminal agent entry, so when the third parity rerun's process died with the root still running, ~$0.99 of its dispatches existed nowhere durable: the live ledger read $4.467 while the journal folded $3.478. Every record now journals the moment its wire call settles, as a `provider-call` decision row keyed by the dispatch seq and the record ordinal in the invocation's own scope; the terminal entry still carries the canonical set, replayed segments append no duplicates, and the crash window shrinks from the invocation's whole history to the one in-flight turn. `invoiceFromJournal` gains the additive `unsettled` lane: dispatches of agents still running at the journal's edge, priced from the incremental rows and kept OUTSIDE the settled totals (run_settle stays the billing boundary). `rulvar cost-audit` grows a sixth check, `incremental-rows-match`: every settled agent's terminal dispatch set must equal its incremental rows, count and per-ordinal usage alike; agents with no rows (pre-RV2008 journals, replayed invocations) pass vacuously. The frozen cassette catalog is re-recorded for the additive rows (journal-shape-revision, policy not identity: existing entries byte-identical, no hashVersion change).

## 1.209.0

### Minor Changes

- 514c7bb: Cache-aware preflight (RV2007). Every spawn report now prices its loop input floors both ways: `uncachedLoopInputFloorUsd` (the declared `estInputTokens` re-billed at the full input rate on every projected provider turn, exactly what the third parity rerun paid at ~$1.10 per worker cycle) and `cachedLoopInputFloorUsd` (one cache write plus a read per later turn at the price row's cache rates, the RV2006 policy's economics, ~$0.19 for the same shape). The new `uncached-long-loop` warning fires when a shape projecting four or more provider turns is about to run with the cache policy OFF on an adapter that declares explicit prompt caching, naming both figures; under the default policy the loop caches and nothing fires. The budgets guide's sizing section carries the worked parity numbers.

## 1.208.0

### Minor Changes

- e7d426f: First-class prompt-cache policy (RV2006). `ChatRequest.cacheHint` existed and the Anthropic adapter compiled it into `cache_control`, but nothing in the core ever populated it: the third parity rerun's workers re-paid the full input rate on every turn of their ~550k-token contexts (`cacheReadTokens 0` across the run), and the $6 envelope sized on OpenAI's implicit server cache was incomparable on Anthropic. The agent loop now compiles the hint on every tool-cycle turn: breakpoints after tools, after system, and after the deepest message, sliding with the history. Default ON exactly where the adapter declares the new `ModelCaps.promptCaching: 'explicit'` (the Anthropic adapter does); OpenAI declares `'implicit'` and undeclared adapters get byte-identical requests. Configure with `defaults.cache`, `AgentProfile.cache`, or per-call `opts.cache` (`CachePolicy { mode?: 'auto' | 'off'; ttl?: '5m' | '1h' }`), call over profile over engine. Billing note: on cache-capable Anthropic models this changes the wire requests of every loop turn to carry cache breakpoints, typically cutting long-cycle input cost several-fold (cached reads bill at a tenth of the input rate); `CostReport` cache accounting is unchanged, the hint never enters identity or journals, and `@rulvar/testing`'s `requestHash` strips it so existing cassettes replay byte for byte.

## 1.207.0

### Minor Changes

- 99beee2: Sequential roster feasibility (RV2005). The third parity rerun's model ignored the one-batch instruction and spawned seat by seat through spawn_agent, so the RV1908 batchGate never saw a batch: three seats were paid in full under an acceptance floor of four the money could never reach, and the settle verdict was bound to reject them. Under a declared `acceptance.minSpawnedChildren`, every SINGLE spawn_agent admission now projects the whole remaining roster with the shared RV2004 arithmetic (this seat's own dispatch projection per remaining seat, live in-flight exposure included) and refuses the FIRST infeasible seat with the typed `roster_floor` verdict, its arithmetic journaled on the decision, zero paid children. Batch seats skip the per-seat check (their batchGate judged the wave entire), and spawn-admission decisions now journal their true origin (`parallel_agents` seats no longer read as `spawn_agent`). For hosts that want the policy unsplittable, `OrchestrateOptions.requireBatchSpawn: 'reject-spawn-agent'` refuses every single spawn_agent call typed (`code 'batch_required'`, nothing journaled, nothing paid) so the model re-issues the wave as one parallel_agents batch.

## 1.206.0

### Minor Changes

- ec8e1f1: One admission arithmetic for preflight and the live spawn_agent verdict (RV2004). The third parity rerun's spawn verdicts journaled reserve/childCeiling $0.50 (the derived childBudgetFraction cap) under a declared profile estCost of $0.70 that dispatch actually committed: the journal lied about the held money, resume would have rolled the lie forward, and the 0.50 allowance would have severed the child mid-work. On the spawn-tool path (spawn_agent, parallel_agents), where the fraction never materializes as an account, the verdict reserve now IS the shared dispatch projection (the declared estimate or the flat default, clamped by an explicit budgetUsd alone), and every verdict names its derivation (`reserve.source`: estCost | default; `reserve.clampedBy`: explicit-budget | fraction-ceiling). Origins with a real allowance account (ctx.workflow) keep the historical fraction ceiling and clamp. Preflight gains the live-root-exposure term: the orchestrator's own worst-case turn floor now rides the embedded spawn gate and `admission.requiredMinimumCeilingUsd` (published as `admission.liveRootExposureTermUsd`), so the parity envelope's fourth seat, which fit the plain 5.95-under-6.00 arithmetic and was refused live, is refused in preflight too. The frozen cassette catalog is re-recorded for the additive `source`/`clampedBy` fields on journaled admission verdicts (journal-shape-revision, policy not identity: existing entries byte-identical, no hashVersion change).

## 1.205.0

### Minor Changes

- 6d224da: The quiescence guarantee: no silent exit (RV2003). The third parity rerun's process exited mid-run with an unsettled top-level await: the parked root's exposure wait held nothing on the event loop, and the journal kept a forever-running root with no `run_settle` and no terminal. Three guards close the class. A parked exposure waiter arms a ref'd keepalive interval (disarmed with the last waiter), so a process whose only remaining work is the wait hangs visibly instead of vanishing; each tick sweeps for the drained state (no holder of any kind left) and wakes waiters `'drained'` as defense in depth behind the event-driven wakes. The engine registers every unsettled run with a process `beforeExit` quiescence watchdog: an event loop about to die with an unsettled run forces that run through the ordinary cancel path, the RV1903 terminal barrier, `run_settle`, and a terminal envelope, even when the body is stuck on a bare promise no signal reaches (the settle race gains a watchdog arm). The invariant, pinned by a regression on the exact parity deadlock shape: no path ends the process while a run has no journaled terminal.

## 1.204.0

### Minor Changes

- efaec9b: Spawned children wait out exposure refusals instead of dying (RV2002). The third parity rerun terminally killed three of four workers, each ~550k tokens into research, with a pre-wire in-flight exposure refusal that would have been a parking for the root. Orchestrator-spawned children (spawn_agent and parallel_agents) now share the RV1902 wait posture: the refused child parks (the `budget:exposure-wait` event carries `scope: 'child'`), retries pre-wire when a live hold releases, and pays zero provider attempts while parked. Only a drained refusal (no live holder left to wait out) ends the seat, and it ends typed and cheap: `AgentError.reason 'exposure-drained'`, carried into the journaled terminal's `error.data.reason`, so the orchestrator tells a starved seat apart from a crashed child and can re-spawn it once money frees. The root keeps its documented forced-finish partial on the drained arm.

## 1.203.0

### Minor Changes

- fb08c10: Every agent terminal returns its live exposure holds (RV2001). The third parity rerun died on the hole: three children killed pre-wire by the in-flight exposure cap left $0.478 of live dispatch estimates parked against the cap forever, and the root's exposure wait starved on money no live dispatch was holding. Holds are now attributed to the invocation whose dispatch they cover; every settle of that invocation (ok, error, exhausted, cancelled, thrown paths included) releases whatever a lost attempt closure leaked and wakes the parked waiters, a late closure can no longer eat the money of another holder, and the live total snaps to exactly zero when the last hold of any kind is gone. `RunBudget.releaseExposureHolder` and `RunBudget.liveExposureHolderCount` publish the surface; zero holders beside live waiters is the drained signal the wait machinery keys on.

## 1.202.0

## 1.201.0

### Minor Changes

- 7e01189: The documentation says exactly what the lifecycle now guarantees (RV1909). The README and the design principles carried "a full cost report" as a promise the twenty-first benchmark falsified; with the exit barrier (RV1903), the settle drain and the journal seal (RV1904) the promise became a lifecycle guarantee, and the docs now state the enforcement rather than the aspiration. The observability guide gains the denominator map: the settled fold, the `run:end` totals, the terminal envelope and `invoiceFromJournal` are one fold that agrees by construction; a mid-run `budget:update` or a refusal's `spent` is an instant of the live ledger, never the terminal; and a later re-fold reproduces the settled figures byte for byte because the seal forbids the journal to move. The benchmark's four views were honest clocks over a roster that kept moving; the lifecycle now stops the roster before the first terminal figure exists.

## 1.200.0

### Minor Changes

- e2ddbdf: The parallel_agents admission policy (RV1908). The four-role benchmark's batch died fail-fast at the third task: the fourth mandated specialist was never attempted, and the run paid two workers in full under a roster floor of four the wave could never reach. `OrchestrateOptions.parallelAdmission` names the alternatives: `'fail-fast'` (the default, the RV805 shape) stops at the first refusal; `'try-all'` attempts every task and reports every refusal in a `refusals` list beside the historical `refused` slot; `'all-or-none'` projects the whole batch against the live remainder with the embedded gate's own formula and refuses it typed (`code 'batch_atomic'`) with zero admissions when it cannot seat entirely, cancelling admitted siblings on a non-budget mid-batch failure. Independent of the policy, a declared `acceptance.minSpawnedChildren` arms the roster pre-check: a batch large enough to seat the floor whose feasible count cannot reach it is refused (`code 'roster_floor'`) before the first child is paid. Runtime behavior only: the tool's schema and description never move, so toolset hashes stay byte identical.

## 1.199.0

### Minor Changes

- 29891c6: The preflight prices the two minimums the benchmark lacked (RV1907). `admission.requiredMinimumCeilingUsd` is the whole-wave fill: every declared row's reserve plus the finalize and synthesis carve-outs, the figure a viable `budgetUsd` must strictly exceed; the four-role benchmark's $6.00 ceiling sat $0.98 below its own wave's 6.98 and lost two of four mandated workers to it. `exposure.requiredMinimumExposureUsd` is the breathing floor of `maxInFlightExposureUsd`: the carve-outs plus the maxInFlight most expensive concurrent turn floors, the orchestrator's own turn among them; the recovery arm's $3.20 cap sat below it and stalled the coordinating turn beside its own full child wave. A declared cap below the floor draws the warning finding `exposure-cap-tight` with the equation priced term by term, naming the RV1902 park it predicts. The budgets guide gains the sizing arithmetic with a worked four-worker example.

## 1.198.0

### Minor Changes

- c097c96: The terminal event semantics say what happened (RV1906). The four-role benchmark's primary stream read a root `agent:end` with status ok followed by a `run:end` error with nothing between them naming the policy fold, and its artifacts carried `contradictions: null` and `claimConsistencyMeta: null` that the judge had to annotate by hand as NOT RUN. The acceptance verdict now speaks on the stream: `orchestrator:acceptance` carries `verdict`, `completion`, `childStatusCounts` and the declared roster floor, emitted from the one journaled decision, fresh and on the resume roll-forward alike. And every semantic pass reports an explicit summary: `semanticPasses` ({`contradictions`, `claimConsistency`, `synthesis`}, each `{ran, reason?}` with reasons `'not-configured'`, `'run-rejected'`, `'valid-draft'`, `'not-run'`) rides the acceptance envelope, the typed rejection data, the `RunOutcome` and `run:end` through the same validated lift as the acceptance roster, so an absent findings field can never be read as a clean pass.

## 1.197.0

## 1.196.0

### Minor Changes

- ec9c3e3: One terminal denominator (RV1904). The four-role benchmark's recovery run reported four mutually inconsistent cost views because the settle raced the roster: RV1903 barriered orchestrations, and this train closes the remaining lanes. The engine's settle drain terminates every live agent invocation of a PLAIN workflow (an un-awaited `ctx.agent` a body returned over) to a journaled terminal before `run_settle` exists. The journal's billing lanes seal after the durable settle: a late append rejects with the typed `JournalSealedError` (`code 'journal_sealed'`), while the detached resolution lane stays open by contract, because resolutions answering a suspension or a parked approval are the documented post-settle appends. And the terminal grows the wire denominator: `CostReport.wireRequests` and `TerminalEnvelope.wireRequests` carry the per-dispatch ledger's provider request count, absorbed continuations included, equal to the invoice cardinality's `wireRequests` on ledger-covered runs by construction, so the terminal a consumer gates on and the invoice a finance pipeline folds finally agree on how many wires the run made.

## 1.195.0

### Minor Changes

- 5702a70: The terminal child barrier (RV1903). The four-role benchmark's recovery journal recorded `run_settle` at sequence 18 and three successful child terminals at sequences 19..21: the returned `RunOutcome`, the terminal invoice, the captured event stream and the final journal each reported a different total, and none was wrong by its own clock. Every orchestration exit, returned or thrown, an accepted or rejected finish, a typed failure, a budget or exposure terminal alike, now passes a terminal child barrier before the workflow settles: `OrchestrateOptions.onUnsettledAtExit: 'cancel'` (the default) aborts the stragglers and awaits their journaled cancelled terminals, `'drain'` awaits their natural terminals bounded by their own limits and budgets, preserving their evidence at the price of the wait. The verdict the run settles with is journaled before the barrier runs, so late children never change it; what ends is the settle racing the roster, and with it the post-settle journal mutation that split the cost views.

  The frozen cassette catalog is re-recorded for the barrier's additive cancelled child terminals in runs that previously left stragglers running past the settle (journal-shape-revision, additive terminals only: existing entries byte-identical, no hashVersion change).

## 1.194.0

### Minor Changes

- 360a659: The orchestrate root waits out transient exposure refusals (RV1902). The four-role benchmark's recovery arm died on a contract violation: the budgets guide names an in-flight exposure refusal transient, but when the refused agent was the workflow's coordinating root, the typed refusal escaped the orchestration and settled the whole run `exhausted` with a null completion while four admitted children were still finalizing. An orchestrate-owned root dispatch (the coordination loop, the synthesis invocation, the forced-finish wake) now parks the refused turn until a live exposure hold releases and retries pre-wire, zero provider attempts while parked, emitting the typed `budget:exposure-wait` event with the refusal arithmetic (`capUsd`, `spentUsd`, `inFlightUsd`, `estimateUsd`, `willWait: true`). A drained refusal (no live hold left to wait out; spend never shrinks, so nothing can turn it into a fit) settles the documented forced-finish partial instead of a bare escape: the run exhausts with the settled children's fold as its value, a journaled `orchestrator_finalize_fallback` decision (`reason 'exposure-abort'`) for replay identity, and `willWait: false` on the event. Plain agents keep the documented settle-as-budget-error behavior, because their caller can catch and decide.

## 1.193.0

### Minor Changes

- 2bca1d1: The admission projection holds the synthesis reserve exactly like the live gates (RV1901). The four-role benchmark's primary arm configured a $6.00 ceiling, a $4.50 orchestrator cap, a $1.00 synthesis reserve and four workers at estCost $0.62; preflight read the wave 5/5 green while the live gate refused the third worker, because the projection netted the synthesis carve-out out of the orchestrator's own row and then held nothing for it at the run root, where the runtime registers it before any spawn admits and both live gates (`refuseSpawnIfInfeasible`, `remainderOf`) count it. The wave arithmetic now carries the hold in both projection layers, and the exact benchmark configuration projects 2 of 4 seats before the first wire, matching the live gate for the same reason. The report exposes the equation: `admission.synthesisReserveUsd` names the hold, every wave row carries `heldAtEvaluationUsd` (the money already held when the row was evaluated), and the declared `orchestrator.acceptance` slice accepts `minSpawnedChildren`, so a wave whose budget seats fewer children than the acceptance floor demands (`minSpawnedChildren` or `childPolicy.minSuccessful`) draws the error finding `admission-below-roster-floor` instead of paying for a roster the settle verdict is bound to reject.

## 1.192.0

### Minor Changes

- 8757601: quota:denied becomes the primary event for recoverable pre-wire waits (RV1810). The twentieth benchmark's run emitted 13 `agent:error` events that were all healthy token-window waits (a clean run, zero provider errors, zero transport retries), so any alert keyed to the event TYPE read a failing run. A recoverable denial now emits `quota:denied` (the denied model, the limiter's reason, `retryAfterMs`, `willRetry: true`); the legacy `agent:error` twin is gone by default and `createEngine({ telemetry: { quotaDeniedAgentError: true } })` restores it, the versioned compat posture. Terminal denial exhaustion still ends in the real `agent:error`. The observability guide gains the vocabulary section beside it: throttling versus failure, why `orchestrator.wakes` counts durable wait suspensions and not progressive await completions, and why internal root work reads from `byRole` while `byAgentType` and `byPhase` keep their honest empty-string buckets (synthetic phase wrappers would move journal bytes and re-key resumes).

## 1.191.0

### Minor Changes

- 745387c: Enforceable coverage floors and two new corpus classes (RV1809). The claim pass graded itself honestly (RV1702) but nothing could enforce a floor: `claimConsistency.minimumCoverageRatio` and `runFactCoverageRatio` (each in `(0, 1]`) now declare the minimums, `onLowCoverage: 'report'` (default) stamps the machine-readable `lowCoverage` block on the meta with each ratio beside its floor, `'fail'` fails the run typed BEFORE the judge dispatch exactly like `onUncoveredCritical`, the meta additionally carries `runFactCandidates` (the uncapped matched count, so both ratios are computable from the meta alone, live or persisted), and `--strict` exits nonzero on a stamped block with the ratios printed. The adversarial corpus grows two classes from the nineteenth benchmark: `modality-overclaim` (a mitigation stated as an unconditional guarantee: the attestation "stops any tool drift" beside the pool reading naming the contract-hash boundary) and `scope-ambiguity` (child-only totals printed as whole-workflow figures), both forming pairs through the same pure folds.

## 1.190.0

### Minor Changes

- 8e02021: MCP discovery gains the visited-cursor guard, the whole-sweep deadline, and the production bounds demand (RV1808). The RV1602 cycle guard caught only the immediate self-echo, so an alternating cursor pair (A, then B, then A again) paginated forever whenever `maxPages` was left unset; the sweep now refuses typed on ANY cursor it has already queried with, unconditionally, like the echo guard. `timeouts.discoveryMs` adds the wall clock over one whole tools/list sweep: per-page `listMs` cannot bound a crawl of promptly-answered pages, and `maxPages` binds only when declared, so the deadline is the bound that watches the sweep as a unit, refusing typed with the page count. And `requireBounds: true` is the production posture: the source refuses at construction unless `maxTools`, `maxPages`, `maxSchemaBytes`, and `timeouts.discoveryMs` are all declared, one typed error naming what is missing instead of four silent unboundeds; the production profiles guide now says to set it.

## 1.189.0

### Minor Changes

- 6a5cc2d: The settled-set consume path, structured tool failure reasons, the labeled fact-sheet scope, and the machine-readable late-child boundary (RV1807). The nineteenth benchmark's root consumed six children with fourteen `get_child_result` calls, eight of them speculative probes that errored on not-settled handles, its answer printed the child-only fact sheet as "the current workflow" totals, and public tool events said only `outcome: 'error'` throughout. Every `await_any` digest now carries `settledHandles` (the settled subset of the waited set at return time, recorded truth like the digest itself); `exposeSettledResultsTool: true` adds `get_settled_child_results(handles, maxCharsPerChild?)`, the bulk first-page read that refuses typed BEFORE any read when a handle is unknown or still running, under its own opt-in so no existing run's toolset hash moves; `tool:end` events carry a structured `errorCode` on failures (`unknown-tool`, `invalid-arguments`, `child-not-settled`, `unknown-handle`, and the RV1807 `data.errorCode` convention for tools that stamp their own); the `RUN FACTS` synthesis sheet names its scope in the quoted bytes (`scope: 'settled-children-only'`, with the whole-run totals delegated to the terminal envelope and invoice); and a finish that validates over a still-running child names it in the structured `unsettledAtFinish` list on the acceptance decision and the result envelope, beside the existing prose degradation note, with the pool boundary documented: a late child's output never re-enters the frozen contradiction and claim pools.

## 1.188.0

## 1.187.0

### Minor Changes

- c9798ef: The absorbed pause_turn wire set survives the error arms (RV1805). The Anthropic adapter published the whole segment set (`wireRequests = { count, responseIds }`) only on the successful terminal finish, so an error after absorbed continuations, a `create()` failure, a truncated read, the continuation cap, or a pre-wire segment denial, yielded bare and orphaned exactly the paid wires a per-request statement join needs most (the segments' usage already survives through mid-stream reports; the ids and the count did not). Every error arm now rides the COMPLETED absorbed segments' wire set on its error data, the agent loop's provider call record reads it when the finish that would have named the set never came (a single absorbed segment included, since an errored dispatch has no plain responseId to join by), the invoice row keeps the ids and the count, and a first-segment failure stays a bare error with nothing invented.

## 1.186.0

### Minor Changes

- 242647e: Three accounting-truth gates (RV1804). The admission `countTokens` probe becomes a policy surface: it is full-prompt provider egress billed to no invoice row, so `defaults.countTokens: 'deny'` (engine-wide) or `AgentProfile.countTokens` (profile wins) forbids the control wire outright, the flat reserve admits exactly like an adapter without `countTokens`, and every probe outcome is a typed `control:wire` event (`ok` with the counted tokens, `failed`, `denied`) instead of a log line only. Strict pricing's declared freshness bound now clamps the future too: a `ratesVerifiedAt` more than one day ahead of the engine clock refuses typed, because a stale-only check reads any future date (the classic typo'd year) as eternally fresh; the one-day tolerance absorbs date-only strings authored ahead of UTC. And statement reconciliation holds the join key unique on both sides: a duplicate response id among the local invoice rows (multi-wire segment ids included) now refuses typed exactly like a statement-side duplicate, because a usage-only export would otherwise settle `match` with a double-booked local row silently absorbed.

## 1.185.0

### Minor Changes

- 1248623: A finalize route declared at the workflow level now fires the finalize phase (RV1803). The role trigger read `[call, profile, engine]` while model resolution read all four layers, so `defineWorkflow({ routing: { finalize: … } })` resolved the finalize model and then never dispatched the phase; the route worked only when repeated at the call, profile, or engine layer. The trigger now reads the same four layers resolution reads, a workflow-only route fires exactly one finalize dispatch, resume replays the journaled synthesis without paying a second one, and a workflow layer without a finalize route still never fires the phase.

## 1.184.0

### Minor Changes

- 8a9caca: The toolset attestation gains an authority side (RV1802). `toolsetHash` pins exactly the model-facing contract tuple {name, description, parameters, version} by design, so under an attested profile a tool whose `risk` flipped from read to write, whose `needsApproval` gate was dropped, or whose `executor`/`executorSpec` routing changed passed the pin silently while changing what the ask rules and the approval flow would do. `resolveToolset` now derives a per-tool authority record `{ contract, risk, needsApproval, executor, executorSpec: sha256(JCS(spec)) }` and an aggregate `authorityHash` riding `ResolvedToolset`; `attestToolset()` records both sides; `enforceToolsetAttestation` refuses authority drift at the same pre-wire site as contract drift, naming the drifted field per tool, with missing and unexpected tools listed and shapes validated at `createEngine` time. Execute bodies stay deliberately unhashable on both sides (`version` remains the lever), and pins recorded before this release keep their documented contract-only posture until re-recorded with `attestToolset()`.

## 1.183.0

### Minor Changes

- dd3767c: The decision chain reads the canonical payloads the engine journals (RV1801). The fold shipped in RV1705 read a resolution's `by`/`target`/`decisionRef` and an abandon's `target`/`authorizedBy` from `entry.value`, but the engine writes those facts in the canonical `entry.resolution` and `entry.abandon` payloads with no entry value at all, so on a live journal the reconstructed authority record lost who resolved, what sanctioned an abandon, and the decision value itself; the fields survived only on hand-authored journals that carried them in `value`. `reduceDecisionChain` now reads the canonical payloads first and keeps the value-carried forms as the fallback, a resolution row's `value` is the decision the ask was resolved WITH when the entry itself carries none, and the operational host acceptance test pins fold-to-journal parity on a live engine run: every canonical field the engine journaled (the external `by`, the referenced ask, the allow, and the deny with its reason) is exactly what the chain row reports.

## 1.182.0

### Minor Changes

- 144d026: The operational host reference ships executed, with the decision-chain audit fold in core (RV1705). The eighteenth comparison benchmark's operational acceptance named four behaviors a production host must prove, not describe: a tenant cannot read or effect across a tenant boundary, a revoked approval is never executed, a redelivered attempt cannot duplicate an external effect, and an audit reconstructs the decision chain. The new operational host guide walks the reference arrangement of shipped primitives for all four, and `examples/src/operational-host.ts` executes them through the full engine on `FakeAdapter`: per-tenant engines by construction (own store, own toolset, strict approvals, ask on every mutating class, the journaled approval deadline), a pre-effect deny path proven empty-ledgered, a guarded effect whose idempotency key suppresses the re-fired side effect while the ledger records both attempts honestly, and a replay on an adapter that refuses to serve leaving the effect count at one. The core half is `reduceDecisionChain(entries)`: one pure l0 fold that reconstructs a run's authority record (approvals with what was asked, resolutions referencing the ask by seq, admissions, abandons, terminations) in the journal's own total order, never inventing a field an entry did not record, tolerant of unknown kinds by the reader obligation, so "who allowed this and when" is a fold instead of an investigation.

## 1.181.0

## 1.180.0

### Minor Changes

- b124d26: Statement reconciliation is core, with a fail-closed intake for raw exports and a fixed adapter contract matrix (RV1703). `reconcileStatement` was provider-neutral from birth, typing only against the invoice and the pricing SPI, but it lived in `@rulvar/openai` and forced Anthropic-only consumers into an OpenAI dependency for a join that never touched OpenAI code; the eighteenth comparison benchmark graded provider readiness "conditionally ready" partly on exactly this asymmetry. The module now lives in `@rulvar/core` and the historical `@rulvar/openai` import paths keep serving the identical functions as re-exports, so no consumer rebuild or import rewrite is forced. New beside it: `statementFromRows({ kind, rows, map })` normalizes a raw keyed export (a parsed CSV, a JSON download) into a `ProviderStatement` under one explicit `StatementColumnMap`, deliberately shipping no per-provider schema knowledge; every mapped cell validates fail-closed with the row index and column name (non-numeric dollars, fractional or negative token counts, empty response ids, unknown component names all refuse typed), absent cells omit their field, and a requests row left with no dollars, no component split, and no usage refuses, because a row without evidence cannot reconcile anything. The providers guide now fixes the per-adapter billing contract in one matrix: what each adapter surface contributes to the join (continuation absorption and the any-id-of-the-set rule for `pause_turn` dispatches, the one-response-id-per-wire contract of the Responses API, the coverage posture for compatible endpoints and the AI SDK bridge), so reconciliation readiness is a documented contract per adapter instead of an inference.

## 1.179.0

### Minor Changes

- 1a5a85a: The claim-coverage grade rides the acceptance envelope, and strict reads it (RV1702). The eighteenth comparison benchmark's run reported `completion: 'complete'` with `contradictions: []` while the judge had seen 40 of 144 citing sentences, and three material falsehoods rode that gap; the counts that told the truth (RV1603) still had to be interpreted. The claim-consistency meta now carries `coverage`, one closed vocabulary a consumer reads instead of inferring semantic health from an empty findings array: `'full'` (every citing sentence had a judged pair, nothing cut, no declared critical anchor missed, the judge settled ok; zero citing sentences grade full vacuously), `'partial'` (a bound cut the fold or citing sentences went unjudged), `'critical-uncovered'` (declared critical anchors got no judged pair), `'judge-failed'` (nothing was judged at all), precedence strongest last. The pure `claimCoverageOf` helper derives the identical grade from any persisted meta, including metas written before the field shipped, so old envelopes grade without re-running. The CLI's `--strict` now reads the grade beside the completion contract: `'judge-failed'` and `'critical-uncovered'` exit nonzero, both states that previously slipped through strict as green, while `'partial'` prints its counts to stderr and keeps the exit, because the bounded pass is the documented default and declaring critical anchors is the opt-in that makes the subset enforceable.

  Journal: the orchestrate acceptance envelope's `claimConsistencyMeta` gains the required `coverage` field on newly settled runs; persisted metas from older engines stay readable and grade through `claimCoverageOf`.

## 1.178.0

## 1.177.0

### Minor Changes

- 94db8ff: Name and pin the progressive drafting pattern (RV1607). The eighteenth comparison benchmark measured 56% of a real run's wall sitting after fan-in, dominated not by validation or repair (both repair turns took seconds) but by the first full draft, composed only after `await_all` even though every primitive for starting earlier already shipped. Two changes make the better shape first-class. The per-child guarantees are now pinned by tests: `await_any` returns the first settled digest while siblings are mid-flight, and `get_child_result` serves a settled child immediately, gated on that child's own settlement and nothing else. And under `exposeChildResultTools` the default orchestrator prompt gains a conditional nudge naming the pattern (spawn the wave, await_any, read the settled child in full, draft the sections its evidence supports, fold the rest in as they settle); the line rides only with the opt-in whose toolset carries the tools it names, so a run without it keeps its exact historical prompt bytes. The docs' orchestration-modes guide gains the pattern section, with `reduceCriticalPath.postFanInShare` as the measure of whether it worked.

## 1.176.0

### Minor Changes

- a74304d: Ship the read-only pilot posture as one factory (RV1606). The production-profiles guide documents the controlled-pilot assembly; the eighteenth comparison benchmark's improvement plan asked for it as a deliverable profile with typed, pre-effect refusals. `pilotAgentProfile(options)` (async: the attestation pins the resolved toolset) builds on `researchAgentProfile` and returns `{ profile, evidence, attestation }`: the confined read-only research toolset with the progress contract and stop conditions, the resolved toolset attested so a drifted registration refuses typed at spawn (RV1514), permissions hard-denying `write`, `network`, `execute`, `destructive`, and `undeclared` risk in one rule with `strictApprovals` armed and `inheritPermissions` off, and isolation pinned to `'none'`. A write-risk tool smuggled through `extraTools` is attested but still refused at dispatch by the risk rule before its execute ever runs. Engine-level posture (budget ceiling, exposure cap, strict pricing, acceptance floors) stays explicit engine and run configuration, deliberately outside the profile's reach.

## 1.175.0

### Minor Changes

- 1999c5d: Adopt recovered spawn decisions by the full canonical spec on a regenerated spawn turn (RV1605). When a dynamic-orchestrator root resumes without its turn-boundary checkpoint (a lost transcript store, or a crash before the first boundary), it regenerates the spawn turn instead of continuing past it. The recovery path for that shape compared only `agentType` and `prompt` at a colliding ordinal, but recovery advances the ordinal counter past every journaled admission, so the collision could not occur: every regenerated spawn re-decided and re-paid its child even with an identical spec, and the eighteenth comparison benchmark separately flagged the two-field comparison as a stale-child hazard had it fired (a changed model hint, schema, or toolset reference would have adopted a child produced under the old spec). Adoption is now content-addressed: a regenerated call whose full spec matches an unclaimed journaled admission byte for byte (`jcsSerialize` over every field) claims the first such decision in journal order, with the settled child replaying free, a dangling one redispatching pinned to its journaled scope, and a recovered rejection rolling forward typed; a call diverging in any field decides fresh, and the prior decision's child stays paid (at-least-once). Checkpoint-continued resumes are untouched: they never re-execute the spawn turn.

## 1.174.0

### Minor Changes

- aa9a772: Split the critical-path synthesize wall by purpose (RV1604). The claim-consistency judge dispatches under role 'synthesize', so `reduceCriticalPath` folded its wall into `synthesisMs` and one number conflated two different tails: the eighteenth comparison benchmark's harness had to annotate a 54-second `synthesisMs` by hand because the run had skipped synthesis (`synthesis_skipped_by_valid_draft`) and the bucket was entirely the judge and its extract phase. `CriticalPath` (and the clipped `postFanIn` breakdown) now carry `finalCompositionMs` (synthesize spans that are not the judge) and `semanticJudgeMs` (spans dispatched under the exported `CLAIM_JUDGE_LABEL`, which the orchestrator's judge invocation now uses as its label constant); `synthesisMs` stays their exact sum, so existing consumers read the same number they always did.

## 1.173.0

### Minor Changes

- 67d27ac: Make the claim-consistency pass say what it did not judge, steer its bounded budget, and hold the draft against the run's own facts (RV1603). The eighteenth comparison benchmark ran the judge over a real dossier: 40 pairs over 144 citing sentences, truncated honestly, with nothing steering which 40 and two run-fact falsehoods sailing through with `executionFacts` enabled ("each role recorded 18-20 evidence entries" over recorded profiles of 23/18/22/20/20/20; "real models were not run" beside 125 recorded wire requests). Three additions close it. `claimConsistencyMeta.coveredCitingSentences` counts the citing sentences with at least one judged pair, so partial coverage is one division away instead of an inference. `claimConsistency.critical` declares anchors (a file, a directory prefix, or a span) whose pairs sort first, before the `max` cap; the meta names every critical draft anchor left unjudged (`criticalUncovered` capped at 32, `criticalUncoveredTotal` beside it), and `onUncoveredCritical: 'fail'` fails the run typed BEFORE the judge dispatch so a run whose declared claims cannot be verified never pays for a partial verdict. `claimConsistency.runFacts` adds the run's recorded execution facts (children, statuses, evidence entry counts, wire and token totals) as a pool reading under the `(run-facts)` anchor: draft sentences naming a minted id, a standalone recorded value of two or more digits, or a `runFactTerms` phrase are paired with the sheet and ruled on by the same judge invocation. All three are opt-in; unset configuration derives byte-identical judge prompts, and the pure fold half (`pairDraftClaims` with `critical`, the new `pairRunFactClaims`) is exported.

## 1.172.0

### Minor Changes

- 0d4770b: Bound the MCP tools/list pagination itself (RV1602). The eighteenth comparison benchmark called out the gap the RV1515 bounds left open: a server answering unique cursors over empty pages grows neither the tool count (`maxTools` never trips) nor any timeout (each page answers inside `listMs`), so the sweep could spin wire calls forever. Two guards close it. The cursor-echo cycle guard is unconditional: a page whose `nextCursor` equals the cursor it was queried with makes no pagination progress and is never a legitimate step, so the sweep refuses with a typed `ConfigError` on the second page at the latest. The new opt-in `maxPages` (positive integer, validated with the other bounds) caps the sweep's wire call count for the general no-progress case; like `maxTools` it fails closed, refusing a server that still reports another page past the cap rather than silently importing a subset of its declared surface. Absent config preserves previous behavior except the cycle refusal, which only ever fires on a protocol-violating server.

## 1.171.0

### Minor Changes

- f6116b9: Enforce the retry namespace separation mechanically (RV1601). The eighteenth comparison benchmark caught the RV1510 promise leaking live: 21 pre-wire quota-limiter denials exported as `agent:end` `retryCount` 21 against an invoice holding zero provider error rows, and each post-denial success record read `attempt` 2 with no attempt-1 sibling. Three changes close it. A denied turn no longer increments `transportRetries`, so `retryCount` reads clean against the provider ledger (the denial stays diagnosable on `agent:error` via `error.data.source: 'quota-limiter'`). A denied turn no longer advances the dispatched try counter, so `ProviderCallRecord.attempt` is the dense 1-based dispatched ordinal by construction and a busy window can no longer exhaust `RetryPolicy.attempts` before the wire ever opens. Denied turns instead retry against their own budget: the new `quota.maxDenials` (positive integer, default `DEFAULT_MAX_QUOTA_DENIALS` = 8, validated at `createEngine` intake) bounds consecutive pre-wire denials per serving target, each still waiting the limiter's own `retryAfterMs`, and exhaustion takes the unchanged failover path, so a permanently denied primary still fails over on the rate-limit trigger and terminates typed as `rate-limit` with no fallback left.

## 1.170.0

### Minor Changes

- 86e4c06: Name the MCP session posture: per-request auth refresh and the drift policy (RV1516, the P1 tail).

  The auth story and the drift story of an `mcp()` source get host-owned contracts. `http.headers` (streamable-http only, forbidden typed elsewhere) injects headers into every wire request through a wrapped fetch; the hook form is awaited before each send, which makes it the refresh point for rotating tokens, with no reconnect and no library-invented 401 retry. `drift` names what a listChanged notification means: `'rekey'` is the documented default (the changed list re-keys subsequently spawned agents), and `'refuse'` fails closed: the notification poisons the source, every later `tools()` refuses typed, and only `close()` clears it, so importing a changed list is always a deliberate host action. In-flight spawn snapshots are untouched either way, and the two refusal layers compose with the toolset attestation: refuse at the source vs refuse at the spawn.

## 1.169.0

### Minor Changes

- 623b2ae: Bound the MCP import surface: the tools/list sweep, per-tool schema bytes, and per-source timeouts (RV1515, the P1 tail).

  An MCP server sits across a trust boundary, and three of its behaviors were unbounded on the host side. `mcp()` now takes three opt-in bounds: `maxTools` caps the tools/list sweep itself (checked after each page against the accumulated WIRE tools, pre-filter, so a hostile server cannot stream past it and an allow list cannot admit past it), `maxSchemaBytes` caps each admitted tool's serialized inputSchema plus outputSchema (the allow/deny filter runs first, so a denied tool's schema bomb costs nothing), and `timeouts` bounds the latencies: `connectMs` races the handshake and releases the client (and a stdio child) on expiry with a typed refusal, while `listMs` and `callMs` ride the SDK request timeout per page and per call, tightening the SDK's own 60s default; a call timeout surfaces as that tool's error result and never propagates past policy. Every bound refuses typed with the measured value and the declared cap in the message; absent bounds preserve the previous behavior byte for byte.

## 1.168.0

### Minor Changes

- ebba79a: Pin a profile's toolset with an attestation and refuse drift typed at spawn time (RV1514, the P1 tail).

  Provider-side drift of an imported tool's description or schema re-keys new spawns silently by design, so a poisoned MCP tool description still reached the model, just under a new content key. `AgentProfile.toolsetAttestation` now pins the hash itself: a spawn whose resolved toolset hashes to anything else refuses with a typed `ConfigError` before any provider call or budget admission. `attestToolset()` records the pin from a resolution (the aggregate `toolsetHash` plus per-tool `toolContractHash` values, both exported), and the refusal names the drift (`changed` / `missing` / `unexpected` tools with both hashes) when the per-tool hashes are present, or lists the resolved per-tool hashes so a stale pin can be corrected from the refusal itself. The pin binds the spawn's RESOLVED toolset, so a call-level tools override and the opt-in escalate tool drift it deliberately; the attestation shape is validated at `createEngine` (64 lowercase hex chars, tool names inside the tool-name pattern), and unattested profiles keep today's re-keying behavior byte for byte.

## 1.167.0

## 1.166.0

### Minor Changes

- d8262c3: Record the semantic completion lift in the run settle and read it back on the persisted terminal (the persisted-terminal tail of the P1 list).

  The persisted terminal (RV1209) documented its own gap: `completion` was unrecoverable by construction, because the workflow's semantic claim rides its result value and only the value's DIGEST is journaled. An offline reader, a restarted server, or a second replica saw the transport status and the money but never whether the work was COMPLETE, which is the one field the consumers doctrine (RV1414) says to gate on beside status.

  The settle now records the lift it already computed. The engine lifts the completion envelope once at the settlement chokepoint (RV-207); the same object now rides the journaled `run_settle` decision value flat beside the output digest (`completion`, `childStatusCounts`, `degradedReasons`, the salvage lists, `belowFloorOkChildren`, `acceptanceChildren`), the outputHash precedent: additive, appended only by segments that computed the value, so a pure replay never overwrites the live baseline. `lastRunSettle` parses the literal back defensively, and `persistedTerminalEnvelope` passes it through the one producer, so a rebuilt envelope carries the same `completion` the live consumer saw. A settle written before the lift rode it stays honestly absent under `provenance: 'journal'` (absence means NOT RECORDED), and the run's own `error` remains the one deliberately unrecoverable field.

  The six plan gating cassettes whose settles gained the recorded lift are re-recorded, and the frozen-fixture lock is refreshed through its ceremony (hashVersion-bump): the settle VALUE grew richer while the identity profile and every hash rule stay untouched, so replay identity is unchanged and the re-recorded fixtures are the same scenarios with the lift visible in their settle rows.

## 1.165.0

### Minor Changes

- 6391274: Carry the recorded evidence entries through the agent terminal and pair the claim pool against them (the deferred RV1501 entries plumbing).

  The seventeenth comparison run's decisive finding had one more half. The worker RECORDED the correct reading through `record_evidence` with the right anchor, its composed output paraphrased the citation away, and the root inverted the reading at synthesis. The claim-consistency pool was OUTPUTS only, so the recorded entry could never pair with the inverted draft, and nothing about the entries survived resume: a replayed child restored neither its evidence verdict nor its recorded content.

  Four halves, one plumbing. The loop collects the CONTENT behind the evidence counter from the same message window and the same result-`recorded` rule (claim plus `file` or `file:lines` citation, bounded: 40 entries, 400 chars per claim), on `AgentResult.evidenceEntries` whenever at least one entry exists, contract or not. The agent terminal journals both the evidence verdict and the entries (`JournalEntry.evidence`, `JournalEntry.evidenceEntries`), additive and policy-only, exactly the artifacts precedent. Replay restores both verbatim, so a resumed orchestrate holds the same settled facts a live run holds. And the claim pool reads a SECOND source per accepted child from the restored entries, one sentence per claim with its citation in the anchor syntax, so a draft contradicting the recorded reading pairs even when the composed output carries no anchor at all; `poolChildren` counts children, never sources.

  Validated live this cycle without paid API traffic: the judge ruling on these pairs was exercised against a real model through the Codex subscription CLI (an adapter over `codex exec`, structured output through the prompt tier) and caught the benchmark inversion and a numeric flip while judging a paraphrased agreement clean, three for three, one dispatch each.

## 1.164.0

### Minor Changes

- 9f2dda9: Seed re-opened budget accounts from the settled journal fold and re-admit reruns of journaled invocations as recovered (RV1505, closing the DEF-7 remainder the eighteenth plan recorded).

  The recovered rerun (the unblock). The reserve recovery rule already said reserves are recovered from the journal and never re-estimated, but the dispatch itself still re-cleared projected admission live: a rerun of a journaled invocation (a dangling dispatch, or a non-replayable terminal retried by resume) was held to spent plus a fresh reserve against the ceiling, and the resume seed already carries the dollars that invocation's prior attempt burned. At an exact-fill ceiling this refused the continuation of the very work the money was spent on, with the ROOT seed alone, before any account seeding: a rerun after an error terminal resumed 'exhausted' with zero provider calls. The ctx.agent dispatch layer now follows the recoverInFlight rule: journaled reruns commit their reserve through admitRecovered, the pre-count feasibility floor gates NEW work only, and the per-turn guard, the pre-dispatch output bound, and the severing signal still bound every dollar a rerun actually spends.

  The per-account seed (the reopened half). With reruns safe, the engine now seeds every re-opened sub-account from the per-account rows of the SAME settled fold the root already seeds from (`accountSpendFromJournal`, RunBudget `seed.accounts`), so a resumed segment admits new work and prices its turns against the history a continuous run would have accumulated. Before the seed, sub-account spend was per-process amnesia: a resumed child re-opened at zero and could silently overspend the very allowance its admission verdict recorded. Two deliberate exemptions keep the seed honest: the root row is ignored (the root seeds from the same fold's total, byte for byte as before), and orchestrator-cap accounts re-arm per segment, because the cap is a per-segment coordination bound and the documented resume after a budget-cancelled root exists precisely to continue past a crossed cap under the root ceiling. A malformed seeded row (non-finite or negative) refuses loud at construction, naming the account, exactly the root seed's poisoned-journal rule.

## 1.163.0

### Minor Changes

- e8d9ada: Report the import bundle's reference closure, serve verify-only journal reads, and close the documentation gaps the benchmark named (RV1511, RV1512, RV1513). The sixth and final PR of the eighteenth plan.

  The import closure report (RV1511). The intake validated shapes, namespaces, and the runId, but nothing held the ENTRIES' own references against the blobs the bundle carries: a torn bundle imported whole and the missing transcript surfaced only when something later read it. `importRun` now returns `{ unresolvedRefs }`, every transcript, checkpoint, artifact, and workflow-source ref the entries (and meta) name that no bundle blob resolves; the default stays permissive (retention and checkpoint pruning legitimately drop blobs their entries still name) and the report makes the gap visible, while `requireClosure: true` refuses typed BEFORE any write. A duplicate blob ref refuses always: last-write-wins over transcript bytes is a torn or edited bundle, never a valid export.

  The verify-only load (RV1512). The A1 salvage model repairs a torn trailing line ON LOAD, which is right for an owner about to append and wrong for an auditor: a verification read that rewrites the artifact it verifies destroys the evidence of the tear. `JsonlFileStore({ repairOnLoad: false })` serves the salvageable records without touching the file, and `rulvar runs audit --no-load-repair` opens the default store that way (contradicting `--repair` is refused typed).

  The documentation debts (RV1513). The README package count now matches its own table (seventeen names, the unscoped pointer included); `@rulvar/executor` ships a README and LICENSE like every sibling; the package reference names the eval framework's real dependencies; and the isolated-executor guide gains "What the ledger is NOT", the explicit denial list (not an outbox, not authorization, not exactly-once, not always on) for exactly the facts the seventeenth comparison run's dossier inverted while citing the sources that state them.

## 1.162.0

### Minor Changes

- 2031e82: Reject invisible format characters in dossier text and split the retry namespaces on the result surface (RV1509, RV1510). The fifth PR of the eighteenth plan.

  The format-character lint (RV1509). The seventeenth comparison run's answer carried five U+200B characters immediately before hidden-file citations, and every configured check passed: the citation pattern's boundary class simply excluded the invisible byte from the match, so the extracted citations were clean while the LITERAL text was not byte-identical to any repository path. `formatCharacterValidator` rejects the whole Unicode format category (`Cf`) with each distinct character's codepoint, first index, occurrence count, and a visible-context excerpt, so the repair turn can find the exact bytes; `allow` admits named characters for content that legitimately needs them (bidi marks in RTL prose), each entry itself required to be a single `Cf` character.

  The retry namespaces (RV1510). The same benchmark exported one conflated "retries" number, and 17 pre-wire quota denials read as 17 provider retries. The agent result (and `agent:end`) now carries `quotaDenials` beside `transportRetries`: pre-wire limiter denials split by dimension (`requests` versus `tokens`, classified by the limiter's own reason vocabulary) with the recovered-episode count. A denial never reached the provider and never billed; provider retry attempts stay in `transportRetries`, and the journaled `providerCalls` records keep the wire cardinality the invoice sums. Live telemetry only, the `transportRetries` rule exactly: never journaled, absent on a replayed result, absent means "zero or unknown".

## 1.161.0

### Minor Changes

- d4547b7: Refuse unpriced, malformed, and stale-priced dispatches before the wire under the opt-in strict pricing gate (RV1508). The fourth PR of the eighteenth plan.

  Dollars come from the price table, and a model absent from it debits NOTHING, so every USD ceiling silently fails to bound it; the docs called that hole honest, and the seventeenth comparison benchmark asked for a mode that closes it. `RunOptions.strictPricing` arms the gate: every paid dispatch must resolve a well-formed price row for its serving model BEFORE the wire call, at the same dispatch chokepoint the exposure admission holds, or the dispatch refuses with a typed `ConfigError` naming the model and the defect (no row, a non-finite or negative rate, a malformed long-context tier). `maxRatesAgeDays` additionally demands a fresh `ratesVerifiedAt` on the row, binding only when declared; `allowUnpriced` lists the exact model refs the host KNOWS are free, the one explicit exception. Each model vets once per run, since the price table is fixed for the run's life.

  The posture follows the exposure cap's durability rule (RV1504): canonicalized and recorded in `RunMeta` at genesis, restored by every resume with no `ResumeOptions` override, absence stays absent, and the store conformance kit holds stores to the round-trip, because a FinOps gate a resumed segment silently drops is not a gate.

## 1.160.0

### Minor Changes

- 1c6f0d0: Require an explicit flavor B default decision and add the monotonic approval composition (RV1506, RV1507). The third PR of the eighteenth plan. BREAKING for flavor B configurations that omitted `defaultDecision`.

  The explicit timeout meaning (RV1506). Flavor B escalation suspends the worker under a journaled deadline, and the deadline's expiry APPLIES the `defaultDecision`; when none was declared the engine invented `accept`, so an unattended scope escalation resolved fail open, the seventeenth comparison benchmark's top authority hardening ask. Enabling flavor B now requires an explicit `defaultDecision` beside the already-required `deadlineMs`, a `ConfigError` before any LLM call; there is no engine default. The tool-approval channel already holds the opposite posture (an unattended approval DENIES at its `approvalDeadlineMs`), so `{ kind: 'cancel' }` is the declaration that makes both timeouts close the same way. Migration is one line on each flavor B config; the runtime semantics of a declared decision are unchanged, and a racing live decision still wins first-closed.

  The monotonic approval composition (RV1507). The permission chain's documented order lets a generic ALLOW (a hook or `canUseTool`) clear a `needsApproval: true` tool, which is deliberate for tests and trusted hosts and a fail-open hazard for a platform profile. `permissions.strictApprovals: true` makes such an allow fall through instead of deciding, so the terminal default still asks for exactly the tools that declared the need; deny and ask keep their power, `{ modifiedInput }` still applies, tools without the declaration keep the historical composition byte for byte, and the flag merges as OR across the engine and profile layers, so a profile cannot loosen an engine-armed mode. A non-boolean value refuses at compile.

## 1.159.0

### Minor Changes

- e881c8b: Record the in-flight exposure cap in RunMeta and restore it on every resume, and fold each budget account's settled spend for audits (RV1504, RV1505 first half). The second PR of the eighteenth plan.

  The durable exposure cap (RV1504). `RunOptions.maxInFlightExposureUsd` was operational and per-invocation, so a resumed segment silently ran WITHOUT the exposure bound the original invocation declared, the seventeenth comparison benchmark's top FinOps gap. The cap now follows the ceiling's exact rule: recorded in `RunMeta` at genesis, restored by every resume, no `ResumeOptions` field to override it, absence stays absent (a run started uncapped stays uncapped, a pre-field journal resumes exactly as before), and the store conformance kit holds stores to the round-trip. One honest asymmetry is documented rather than papered over: `limits` stay per-invocation, so a resumed segment that does not re-supply them prices turn estimates from the model's full output allowance, and a tight restored cap then refuses dispatches the original clamped estimates admitted; that direction is fail closed, never silent uncapping.

  The per-account audit fold (RV1505, the audit half). `accountSpendFromJournal`, exported from `@rulvar/core`, folds the same settled entries the cost report folds into each budget account's INCLUSIVE spend, with the account tree read from the journaled spawn-admission decisions, so a host can hold any orchestrator cap or child allowance against what its subtree actually spent on a plain stored journal. Abandoned subtrees and unpriced slices contribute zero, exactly like the net total. Seeding the fold into re-opened accounts on resume is deliberately NOT wired yet: a rerun of a journaled invocation re-admits with exact-fill arithmetic today, so spend-at-reopen would refuse the continuation of the very work the money was spent on; the reopen seeding lands together with a seed-aware rerun re-admission, and the docs name the remaining amnesia instead of hiding it.

## 1.158.0

### Minor Changes

- a266bc7: Hold the composed draft to the pool it composed from, with a bounded model judge over anchor-paired claims, and show the run its own execution facts (RV1501, RV1502, RV1503). The first PR of the eighteenth plan.

  The claim pairing fold (RV1501). The seventeenth comparison run's security child read `packages/executor/src/subprocess.ts:256-296` correctly (a failed audit write does not mask success), and the ROOT inverted the claim in the final draft while citing the very same span; every configured check passed because each judged the draft alone, never against the pool that contradicted it. `pairDraftClaims`, exported from `@rulvar/core`, is the pure half that closes the gap: every draft sentence citing an anchor (`path:line` or `path:start-end`, the citation pattern extended with a range suffix) is paired with the accepted pool sentences citing an intersecting span of the same file, verbatim agreement dropped, everything bounded (pair cap, per-pair pool cap, excerpt cap) and fail closed at intake, deterministic and journal-free like `findContradictions`.

  The claim-consistency judge (RV1502). `orchestrate({ claimConsistency })` wires the fold to the post-fan-in chokepoint, strictly after the contradiction pass and before any synthesis dispatch, and rules on the pairs with ONE bounded structured-output invocation under role 'synthesize' (`judge.model`/`judge.effort`/`judge.limits`/`judge.estCost` override the routing chain). No pairs means no judge dispatch. The verdict is an ordinary journaled agent entry, so a resume replays it with zero paid calls. `onFound` speaks the contradiction pass's vocabulary: 'report' puts `claimContradictions` and `claimConsistencyMeta` on the acceptance envelope, 'carry' rides a `CLAIM CONTRADICTIONS:` line in the single-mode synthesis prompt and blocks the valid-draft skip while findings stand, and 'fail' fails the run typed with `data.source` 'orchestrator_claim_consistency' before anything pays to compose the inversion away. A dead judge is a named fact (`judgeFailed` on the meta, findings absent, never an empty list that would claim agreement) and fails the run only under 'fail'.

  The execution self-facts (RV1503). The same run graded its whole dossier `live-observed: no` while the harness had just watched 118 wire requests settle, because no surface ever showed the composing model what its run executed. `executionFacts: true` puts a replay-stable `facts` block (wire requests, missing response ids, journaled token totals; dollars deliberately absent because replay re-prices) on every await `TaskDigest` and every `get_child_result` page, and `synthesis.runFacts: true` folds the aggregate `RUN FACTS:` line into the synthesis prompt, naming its own boundary: live-observed by this run's own harness, production evidence it is not. Both off by default, byte-identical surfaces without them.

## 1.157.0

### Minor Changes

- 1883421: Hold ok children to their declared evidence floor, declare the cost basis on every money surface, and document the terminal contract for consumers (RV1412, RV1413, RV1414). The sixth and final PR of the seventeenth plan.

  The ok-child evidence floor (RV1412). RV1207 made a declared evidence contract binding for the salvage arms, but a child that settled 'ok' below its declared floor sailed through acceptance behind a clean headline: its roster row said `met: false` while `completion` said 'complete' and `degradedReasons` stayed empty. The shortfall is now a degradation note by default, so the completion claim stays honest ('partial', never 'complete' over an unmet declared contract) while the verdict and the status counts stay exactly what they were, and the envelope, the `run:end` lift, and the `RunOutcome` mirror carry `belowFloorOkChildren` naming such children machine-readably. Under the existing `acceptance.requireEvidenceFloor` flag the floor binds for ok children exactly as it does for the salvage arms: the child counts against the policy ('all-ok' rejects, `{ minSuccessful: N }` does not count it), its roster row is marked `floorRequired: true`, and in an accepted run it stays out of the contradiction pool and the synthesis evidence index, read from the decision's own roster rows so live and resume derive the same pool. What neither mode changes: `childStatusCounts` stays factual and the child's output stays visible through the digest and `get_child_result`. Deliberately out of scope: the pre-acceptance finish validators keep reading ok children's citations as evidence, because validation runs before the verdict and paid journaled text is real either way.

  The cost provenance marker (RV1413). Every dollar the engine reports is journaled usage priced at the CALLER'S pricing table, never a provider statement, and the seventeenth comparison run's "$4.79" read as an invoice figure precisely because nothing said otherwise. `CostReport.basis` and `TerminalEnvelope.costBasis` now declare `'locally-estimated'` as a literal, stamped by both report builders and at the envelope's one producer (journal rebuilds included), mirroring `InvoiceExport.pricingBasis`. No field is renamed; reconcile real bills through the invoice export and `reconcileStatement`, which carry their own provenance.

  The terminal contract for consumers (RV1414). A new documentation section pins the doctrine the vocabulary was built for: `status` is transport, `completion` is the work's own claim, the acceptance verdict is a policy over statuses, and none of them, alone or together, authorizes a side effect. Effects during the run belong to tools behind the permission chain and approvals; effects after the run belong to the consumer's own policy over the terminal facts, read from the settled authority (the persisted envelope or its typed refusal), with the money read as what `costBasis` declares and absence read by each field's absence doctrine.

## 1.156.0

### Minor Changes

- 537144e: Validate every restored counter at the checkpoint decode boundary, count single-wire rows in the invoice join-coverage aggregate, and resolve run profiles by own property (RV1409, RV1410, RV1411).

  `decodeCheckpoint` now refuses a blob whose required counters are not non-negative finite numbers: `turns`, `toolCallsUsed`, `schemaAttempts`, every usage field (the optional ones when present), and the compaction points (RV1409). Those counters seed the loop's limit arithmetic and are reported to the budget as paid spend, and none of the refused shapes was ever produced by a boundary write (JSON delivers the NaN corruption as `null` and `1e999` as `Infinity`), so the blob as a whole is untrustworthy and the dangling dispatch reruns from the top, exactly like a blob that does not parse. Before this shipped, a store-side corruption or a hostile writer could restore `turns: -2` and credit the `maxTurns` ceiling with turns nobody paid. Deliberately not judged at decode: the Usage invariant, integer rules, and TTL splits. Checkpoints written before those invariants shipped are honest evidence of paid work and still decode; the restore path sanitizes them exactly as it always has.

  `InvoiceCardinality.wireIdsMissing` now counts the requests across EVERY dispatch row that carry no join key (RV1410). A single-wire row is its one request, joined by the row's own `responseId`, so an id-less single-wire row contributes one missing key; failed requests count like any other, because the provider may have billed them and a statement line cannot be joined to a row with no id either way. Before this shipped the counter looked only inside multi-wire rows, so a fleet of single-wire dispatches whose adapter surfaced no response ids read as fully joined (`wireIdsMissing: 0`) while every row-level verdict said `missing-provider-id`: the aggregate contradicted its own rows.

  `runProfile()` resolves the shipped preset roster by own property (RV1411, the last prototype-sensitive surface of the RV1205 class): an inherited object name (`toString`, `constructor`, `__proto__`) is not a profile and now returns `undefined`, the value hosts key their unknown-name refusal on. The CLI's `--profile toString` becomes the typed unknown-profile `ConfigError` naming the shipped roster instead of a silently accepted empty profile.

## 1.155.0

### Minor Changes

- 49b08a7: Make the persisted terminal tail-aware and give offline authorities the engine's own resolution validator (RV1407, RV1408). The persisted terminal (RV1209) served the journaled settle even when the journal had CONTINUED past it, so a restarted reader could hold yesterday's envelope over a run that a detached resolution had already destined to resume, or that a successor segment was actively working, while `auditRun` derived a non-terminal status from exactly that evidence. `persistedTerminalEnvelope` now refuses `not-terminal` whenever entries follow the last settle, with a message naming the continuation (count and settle seq), so the persisted surface and the audit read one journal one way; the conformance table pins the new refusal (settled-then-continued) beside the five terminal paths. And the CLI server's offline resolution used a lookalike validator that demanded the plain `{ decision }` from EVERY kind-'approval' suspension: a legitimate `EscalationDecision` for a flavor B escalation was refused, and a wrong-shaped plain approval payload was waved into the journal. The new export `validateDetachedResolution` is the engine's own detached validation (the RV1203 flavor classifier, both payload arms, the pinned schema) as one function; the engine's detached path and the CLI offline path now call the same bytes, so an escalation resolves offline with its OWN payload exactly as detached-live, and an invalid one is refused typed before anything is journaled.

## 1.154.0

### Minor Changes

- 9259f24: Reserve the tail of the turns axis and project it in preflight (RV1405, RV1406). The seventeenth comparison experiment's worker burned `maxTurns` 28 at 66 of 96 executed tool calls and settled `limit` with no finalize phase, because the finalization reserve fires on tool-budget limiters and the finalization window watches tool-budget counts, and nothing watched the turns. The new opt-in `limits.finalizationTurns: { reserveTurns, allow? }` extends the SAME window regime to the turns dimension: once the remaining turns against `maxTurns` drop to `reserveTurns`, non-allowlisted calls receive the typed window refusal, the one-time notice names the turns arithmetic, and the terminal tool stays admitted. The regime keeps one allowlist (`finalizationWindow.allow`, else `finalizationTurns.allow`, else the zero-cost tools); with both dimensions inside their reserves the smaller remaining binds, and the notice, every refusal, and the RV509 decision entry (`budget: 'turns'`) all name the binding dimension's own reserve. The tail lives INSIDE `maxTurns` (the ceiling stays a ceiling), the RV1208 deficit widening stays calls-only, repair-turn grants are deliberately not counted, resume re-arms identically, and configuring the reserve alone makes the `toolBudget` snapshot (and the policy-facts window line) present so a turns-only run has a home for `finalizationWindowEntered`. Preflight gains the turns-axis projection `turns-bind-before-tool-budget` (RV1406): when `maxTurns` fits fewer serial executed calls (one per turn plus the final answer turn) than the effective executed-call ceiling, extension grants included, the finding says the turns axis binds first, as a warning without the reserve and an info with it, never a stop; and `finalization-turns-covers-max-turns` (warning) when `reserveTurns` is not below `maxTurns`.

## 1.153.0

### Minor Changes

- d8bebcb: The contradiction pass and every evidence pool judge the ACCEPTED roster, and the carry posture becomes an invariant (RV1403, RV1404).

  The seventeenth comparison run exposed both halves. Its pass judged five of six accepted children, because a limit child accepted as a structured partial carried no terminal output and the pool's eligibility only knew the output arm; and its `onFound: 'carry'` configuration would have silently carried nothing had the pool disputed itself, because a valid draft skipped the synthesis the carry line was supposed to ride.

  RV1403 makes the roster the acceptance decision counted the one pool every downstream surface reads. The contradiction pass and the synthesis `evidenceIndex` judge the ok children plus both salvage arms, taken from the decision itself (fresh or rolled forward from the journal, so live and resume derive the same set): an accepted structured partial's rival reading can now dispute the pool and its citations index, while a child blocked by the binding evidence floor (RV1207) stays out even when it carries a validated terminal output, because a reading the policy refused to count must not steer what composes the result. The finish validation snapshot predicts the same arms: a partial-accepted child is marked with the new `FinishValidationChild.salvageablePartial` (so `evidencePreservedValidator` counts the accepted partial's citations and `requireKnown` no longer flags an honest quote of it as fabricated), and a below-floor child is no longer marked `salvageableOutput`, mirroring exactly what acceptance will do.

  RV1404 adds two honesty guarantees. Non-empty findings under `'carry'` disable the `skipWhenDraftValid` gate for that draft, announced in an info log (`orchestrator synthesis skip blocked by contradictions`); a clean pool keeps the skip byte for byte, and a skip already journaled stays the authority on resume. And the envelope gains `contradictionsMeta` beside `contradictions`, present exactly when the pass is configured: `poolChildren` says how many accepted children were judged, and `truncated` says whether more contradictions existed than `max` allowed to report, so a capped findings list can never read as a complete one. The pass log event carries the same flag, and the `'fail'` posture's typed error data carries the meta beside the findings.

## 1.152.0

### Minor Changes

- dd6a616: Rebuild the repository-aware citation surface from scratch (RV1401, RV1402). v1.151.0 first shipped this surface; this release replaces that implementation with a fresh cut of the same declared contract, and the public signature is unchanged.

  `citationTargetsValidator` (RV1401) resolves EVERY citation of the result text against the host's frozen source snapshot, inline code and plain prose alike, with no sentence-level precondition. The seventeenth comparison run's answer carried `ghost.ts:0`, a location no checkout ever held, and the whole configured chain passed it: the citation pattern accepts any digits (a line of 0 included), `evidencePreservedValidator`'s `requireKnown` proves only that some child SAID the string, and `citedValueValidator` resolves a citation only when its sentence asserts an inline value beside it, so a fabricated location nobody asserted anything about counted as provenance and licensed the valid-draft skip. Three refusals, each fail closed: a match of the citation pattern that does not parse as `path:line` with a safe integer line is refused rather than skipped, because the host's own pattern claims it IS a citation; a line below 1 is refused BEFORE the resolver runs, because source lines are 1-based and a sloppy resolver might well answer line 0; and a location the resolver does not know is refused, because a citation nothing resolves is not provenance. Repeated occurrences are judged once, refusal reasons cap at 20 listed offenders, `fencedCode: 'excluded'` strips fenced code before scanning (default `'counted'`), a text carrying no citation at all passes (demanding citations exist is `minMatchesValidator`'s job), and intake is fail closed in the RV610 posture: a pattern that does not compile or that can match the empty string is refused typed. Wired into `finishValidation`, the refusal reaches the `skipWhenDraftValid` gate like every other validator verdict, so a draft carrying a fabricated citation can no longer skip the synthesis it was supposed to earn.

  `citedValueValidator` (RV1402) now matches asserted values as WHOLE tokens instead of substrings. The boundary class is word characters plus the dot: an asserted `3` no longer counts as carried by a line saying `30` or `3.5` (the seventeenth comparison judge's repro), `retry.ts` no longer matches inside `myretry.ts`, and the value itself is matched literally with regex metacharacters escaped.

## 1.151.0

### Minor Changes

- 1de0610: Every citation in a finish result can now be resolved against the host's own source snapshot, and cited values match as whole tokens (RV1401, RV1402).

  The seventeenth comparison run shipped an answer carrying `ghost.ts:0`, a location no checkout ever held, and every configured check passed: the citation pattern accepts any digits (a line of 0 included), `evidencePreservedValidator`'s `requireKnown` proves only that a child SAID the string, and `citedValueValidator` resolves a citation only when its sentence asserts an inline value beside it. A fabricated location that no sentence asserted anything about therefore counted as provenance and licensed the valid-draft skip.

  `citationTargetsValidator` closes the hole at the root. Every match of the citation pattern in the result text, inline code and plain prose alike, is parsed as `path:line` and resolved through the same pure `resolve(target)` snapshot contract `citedValueValidator` takes, with no sentence-level precondition. Three refusals, each fail closed: a match that does not parse as `path:line` is refused rather than skipped, a line below 1 is refused BEFORE the resolver runs (source lines are 1-based, and a sloppy host resolver might well answer line 0), and a citation the resolver does not know is refused, because a citation nothing resolves is not provenance. Repeated occurrences are judged once, `fencedCode: 'excluded'` strips fenced code first for hosts whose contracts already exclude it, and intake is fail closed in the RV610 posture: a pattern that cannot compile or can match the empty string is refused typed. Wired into `finishValidation`, the refusal also reaches the `skipWhenDraftValid` gate, so a draft carrying an unresolvable citation can no longer skip the synthesis it was supposed to earn.

  `citedValueValidator` now requires an asserted value to appear in the cited line as a WHOLE token instead of a substring: judged by `includes`, a claim of `3` was satisfied by a line saying `30`, which is the seventeenth judge's repro. The boundary class is word characters plus the dot, so `3` matches neither inside `30` nor inside `3.5`, and `retry.ts` no longer matches inside `myretry.ts`; spaces, punctuation, operators, and the line edges still bound a token.

## 1.150.0

### Minor Changes

- a331211: The settled child pool is checked against itself before anything composes it (RV1301, RV1302, RV1303).

  A fan-out produces N independent children, and nothing in the pipeline compared their claims against EACH OTHER. Acceptance judges each child alone, the finish validators judge the final text mechanically, `citedValueValidator` judges a claim against the SOURCE rather than against another child, and `dedupeClaims` matches on agreement, so it is blind to disagreement by construction. A run where one child read `attempts: 3` at `src/retry.ts:33` and another read `attempts: 5` at the same line put both into the synthesis prompt, the composing model picked one, and the run settled confident with no surface recording that its own evidence had disputed itself. This is the sixteenth comparison judge's P2-1 remainder, deferred at the time as a phase that deserved its own release.

  `orchestrate({ contradictions })` folds the settled evidence pool at the post-fan-in chokepoint: after the accepted acceptance verdict, before any synthesis dispatch. It is bounded in the strongest sense available, a pure fold with no model call, no clock, no host code, and no journal entry of its own, so it costs nothing in the post-fan-in window `reduceCriticalPath` measures and a resume re-derives the identical finding for free. The rule is deliberately narrow, so a finding is always explainable in one sentence: two DIFFERENT children credit the same cited location with different values for the same key. It reads the same span vocabulary the RV1212 validators read (inline-code spans that parse as `path:line` are the anchors, the rest are the values asserted about them) and splits each value at its first `:` or `=` into a key and a reading.

  Three non-findings are as deliberate as the finding. Two keys on one line (`attempts: 3` beside `backoffMs: 100`) are aspects of that line, not a dispute, so the key must match. A span with no separator names something without asserting anything about it, and two such spans can never conflict. And one child holding both readings is narrative inside a single document, not a pool contradiction, while two independent children disagreeing is exactly the signal the pool cannot resolve by itself. The pool judged is the evidence pool `evidenceIndex` indexes, ok children plus salvage-accepted ones, so a dead child's error text can never dispute a real finding.

  `onFound` picks the posture. `'report'` (the default) puts the findings on the acceptance envelope and in an info `log` event and changes nothing else. `'carry'` additionally rides a `CHILD CONTRADICTIONS:` line in the `'single'` synthesis prompt demanding each disagreement be resolved explicitly instead of silently picked, and requires that synthesis (a `ConfigError` at intake otherwise, and the deterministic `'incremental'` reconciliation has no prompt at all). `'fail'` fails the run typed with `data.source` `'orchestrator_contradictions'`, the findings, and the acceptance snapshot the run already earned, BEFORE any synthesis dispatch, so a self-contradicting pool never pays for the invocation that would compose the disagreement away.

  The envelope field distinguishes two facts that look alike: `contradictions` is present whenever the pass was configured and EMPTY when it ran and the pool agreed, while its absence means nothing looked. That is the RV1209 absence doctrine applied to a second surface. `max` bounds the findings (default 20) and `pattern` overrides the anchor shape, refused fail closed at intake on a pattern that can match the empty string. Everything stays byte identical without the option, and a `'carry'` run whose pool agrees emits the identical synthesis prompt bytes as a run without the pass.

  One honest bound: this is the mechanical half. Two children disagreeing in prose, with no shared citation and no shared key, are invisible to it, and closing that needs a bounded model pass with its own budget, journal, and resume semantics, which will consume this same `Contradiction` shape. The pure fold ships first because it is free, deterministic, and reproduces on replay. `findContradictions` is exported from `@rulvar/core` so a host can run the same rule over any pool it holds.

## 1.149.0

### Minor Changes

- 08b4537: The post-fan-in model bucket is profiled, the final answer gets two evidence validators, and the terminal envelope's typed error is detached (RV1211, RV1212, RV1213).

  `PostFanInBreakdown` splits the coordination model bucket three ways. `coordinationModelMsByPhase` keys the activation wall by the activation's OWN invocation role, so a tail spent compacting is distinguishable from a tail spent drafting. `coordinationModelOnlyMs` is that wall with the tool executions NESTED inside it removed, the exact set difference of the two clipped unions rather than a subtraction of sums, because a tool an activation called runs inside the activation's wall and reading the wall as thinking time overstates it by exactly the tool share. `coordinationToolCallsByName` counts the executions beside their milliseconds, so one slow pagination and twenty fast ones stop reading as the same tail. The sixteenth comparison experiment put 222.6 seconds (50.9% of wall) in this bucket with a zero synthesis share, and one number for it could not say what the coordinator was doing.

  Two new finish validators judge the answer's evidence rather than its shape. `evidenceGradeValidator` requires every sentence claiming something is `live-observed`, came from the `provider bill`, or is `production-proven` to name a run id or a `file:line` citation in THAT sentence; the phrase list and the artifact pattern are configurable, and a pattern that can match the empty string is refused typed because it would satisfy every graded claim silently. `citedValueValidator` checks that a cited location actually carries the value its sentence asserts, against a source snapshot the host resolves: within one sentence the inline-code spans that are not citations are the asserted values, each must appear in the cited line (or within `window` lines after it), a location the resolver does not know is a failure rather than a pass, and a sentence that cites without asserting an inline value passes untouched. `resolve` must be pure over a snapshot frozen before the run, like every finish validator.

  `TerminalEnvelope.error` is now a detached copy, its `data` nesting included, exactly like `costByModel`: a consumer that annotates the error it holds can no longer reach back into the outcome the engine still owns.

## 1.148.0

### Minor Changes

- c85dac9: The terminal envelope survives the process that produced it, and the invoice states how many provider requests its rows represent (RV1209, RV1210).

  A run this server never held used to answer `GET /runs/:id` with a bare status projection while a live consumer read the whole `TerminalEnvelope`, so the durability story stopped one surface short of the one a host reads after a restart. The non-live response now carries `envelope` too, rebuilt from the journal through the same producer and marked `provenance: 'journal'`: the verdict comes from the journaled run settle (the authority, not the meta projection), the money from the same composed settle-pin fold `GET /runs/:id/cost` runs, and the usage and `agentsSpawned` from the same ledger fold the resume budget seed uses. Two fields are deliberately absent on a rebuilt envelope and the marker is what makes their absence honest: `completion` (the workflow's semantic claim rides its result value, and only that value's digest is journaled) and `error` (the run's terminal wire error is never journaled as the run's own), so absence there means NOT RECORDED, never "the workflow claimed nothing" or "the run did not fail". A live envelope carries no `provenance` at all and keeps its original byte contract. Where nothing durable records a terminal, the body carries a typed `terminalUnavailable: { reason, message }` (`unsettled`, `not-terminal`, or `unknown-workflow`) instead of an envelope; it is its own field, never `error`, because `error` on that body means the run failed. `persistedTerminalEnvelope` is exported, and the terminal-envelope conformance table now drives every row through a restarted server as its final surface.

  The invoice declares the dispatch-versus-wire cardinality (`cardinality: { dispatchRows, wireRequests, multiWireRows, wireIdsMissing }`). One row is one logical dispatch, and a dispatch that absorbed provider-side continuations is billed as several HTTP requests, so a per-request statement has more lines than the export has rows by construction: reconcile a statement line count against `wireRequests`, never `rows.length`. The per-row `wireRequests` behind it comes from the count the adapter reported rather than the length of `wireResponseIds`, because a provider that leaves an absorbed segment unnamed still billed it, and counting ids alone made the invoice contradict the quota window that settles on the same count. Single-wire dispatches carry neither field and stay byte-identical.

  Two limiter fixes ride with it. An abort landing inside an awaited quota reservation now stops the wire: a limiter that queues can hold `reserve` past the dispatch's own abort check, and the engine rechecks the host and budget signals when the reservation resolves, releasing the granted admission rather than reconciling it, because a settlement only ever adds while that call provably never happened. And the unused-continuation release is fail closed on the wire count: only a finish that names its wire set proves which pre-wire grants went unused, so a finish carrying no count releases nothing, instead of reading the absence as one flown wire and handing a hook-granting adapter back exactly the capacity it had consumed.

## 1.147.0

### Minor Changes

- 6367231: A declared evidence floor can be made binding, and the finalization window can reserve the calls that close it (RV1207, RV1208). Two opt-ins answer the sixteenth comparison run, where a worker spent 108 tool calls, settled `limit` with 10 of its 14 declared evidence entries, and was promoted through terminal-output salvage with the floor waived, so the run reported `status: 'ok'` with `completion: 'partial'` over an unmet contract.

  `acceptance.requireEvidenceFloor: true` makes the declared floor binding: a child that declared an evidence contract it did not meet is never promoted by a salvage arm, so it counts against the policy exactly like an unsalvageable `limit` child (`'all-ok'` rejects; `{ minSuccessful: N }` does not count it toward N). Salvage stays diagnostic: the acceptance roster still records the arm that would have applied and the evidence verdict, marked `floorRequired: true` instead of `waivedBySalvage: true`, the `degradedReasons` name the shortfall with its counts, and the child's output stays visible through the digest and `get_child_result`. A child with no declared contract, or one that met its floor, is untouched.

  `limits.finalizationWindow.reserveForEvidenceDeficit: true` makes the reserved tail evidence-aware: with an evidence contract declared, the effective reserve is the larger of `reserveCalls` and the outstanding deficit plus one summary call, recomputed at every boundary from the same successful-`record_evidence` window the floor refusal and the RV809 deficit trigger read. A fixed reserve can be outgrown by the deficit it was meant to cover; this one cannot, so searching stops while the floor is still closable. The reserve collapses back to `reserveCalls` as entries land and never narrows below it, and the one-time window notice names the live deficit. Both options are off by default and the surrounding behavior is byte-identical without them.

## 1.146.0

### Minor Changes

- 5d9bbc8: Profile vocabularies are what the host registered, nothing inherited, and `importRun` applies the one safe runId guard (RV1205, RV1206). Every profile map read went through a bare index, which resolves the JavaScript prototype chain: an `agentType` naming `toString`, `constructor`, or `hasOwnProperty` resolved a function as its "profile", passed the `profiles` allowlist, recorded a `spawn:admitted` decision, and burned the slot before dying downstream on the inherited value (the sixteenth experiment's judge reproduced it as R3). All four surfaces now read own properties: the orchestrate advertisement filter (which additionally builds a null-prototype advertised map), the allowlist enforcement and profile resolution at spawn, `ctx.agent`'s agentType registration check, and the preflight spawn-spec resolution. A prototype name is now exactly as unknown as any unregistered name: it refuses typed before admission and consumes nothing. Separately, `engine.importRun` now applies `assertSafeRunId` at its intake, the same guard `engine.run` and `engine.resume` use: an import previously validated only "non-empty string", so a bundle claiming `..`, a slashed path, or an over-length id reached the stores raw.

## 1.145.0

## 1.144.0

### Minor Changes

- c11bcd6: Detached resolution picks its validator by the suspension's journaled flavor, and journaled deadlines are range-checked and corruption-checked (RV1203, RV1204). The v1.143.0 opt-in approval deadline made the detached resolver's deadline-presence heuristic wrong: a settled run's TIMED tool approval rejected the plain `{ decision: 'allow' }` as a malformed escalation decision, so nobody could resolve it detached and the parked approval always died at its deny-by-timeout (the sixteenth experiment's judge reproduced it as R2). The detached path now classifies by the suspension's own shape: an escalation is recognized by its structural invariant (a required deadline plus the hardcoded toolName `escalate`, true by construction since flavor B shipped), every approval suspension written since v1.144.0 journals an explicit `flavor: 'approval'` in its payload to pin the one ambiguous name (an ordinary tool literally called `escalate` that opted into the deadline), and the validator follows that flavor, deadline or not. Both deadline knobs (`permissions.approvalDeadlineMs`, the escalation `deadlineMs`) now share a compile-time deadline ceiling of one hundred years in milliseconds, so `now + interval` always journals as a valid absolute date instead of passing the positive-integer check and dying generic with `Invalid time value` at the `Date` conversion (judge repro R4). A journaled `deadlineAt` that does not parse as a date refuses typed as journal corruption, at `importRun` intake (the journal shape gate) and again before any timer arms; the old `Date.parse(...) || now` fallback silently resolved such an entry immediately, an instant deny for an approval and an instant default decision for an escalation.

## 1.143.0

### Minor Changes

- f412169: The opt-in approval deadline (RV1107): `permissions.approvalDeadlineMs` (engine-wide or per profile, most specific wins) journals an absolute deadline on the ask suspension entry, and an approval nobody resolves by then is DENIED by a resolution `by: 'timeout'` through the same first-closing-wins arbiter every live decision uses. The machinery is the flavor B escalation deadline's, one suspension kind over: the timer arms FROM THE ENTRY (so the deadline survives resume and a config change never moves an already-journaled one), a live decision cancels it, the deny fails closed with a typed reason the model sees as the denied tool result, and a run parked `'suspended'` in a live process still denies at its deadline, the resolution appending durably for the next resume to fold. Absent config keeps the documented indefinite wait. The docs gain the deployment boundary section (RV1108): what the engine enforces versus advises, and the IAM, KMS, DLP, case-store, and PII-canary posture that deliberately lives outside the library.

## 1.142.0

## 1.141.0

### Minor Changes

- 4f12a62: The unified terminal envelope (RV1105, the P1-5 arc): every terminal fact of a run travels in ONE exported shape, `TerminalEnvelope` (run identity, status, the typed error, the completion claim, `settled` + `settledReason`, `totalUsd`/`grossUsd` with the detached per-model split, the usage aggregate, `usageApprox` normalized to a boolean, and `agentsSpawned`), assembled once at the settlement chokepoint by the exported `terminalEnvelopeOf` after the settlement verdict is known. Every surface carries that object: the resolved outcome (`outcome.envelope`, always `settled: true`, because an unsettled terminal rejects typed instead of resolving), the `run:end` event (`event.envelope`, where the `settled: false` envelopes live with the superseded reason inside), the server's `GET /runs/:id` response, and the OTel exporter (`rulvar.run.total_usd`, `rulvar.run.agents_spawned` beside the existing settled attributes; a persisted stream from an older engine still closes its span). Nothing pre-existing was renamed or removed: the envelope is an assembly over fields that all remain.

## 1.140.0

## 1.139.0

### Minor Changes

- 03a2141: The live budget debits each provider call marginally against the call's own accumulated price (RV1101): a long-context tier crossed by the call's sum that no single mid-stream slice reached now re-prices the whole call live at the crossing slice, exactly the dollars the settled fold records, and a ceiling between the per-slice and tiered readings severs the run instead of settling ok over its own hard cap. `RunBudget.openCallMeter` and the optional `BudgetHooks.openCallMeter` carry the seam (one meter per provider call, the settled fold's billing basis; the mid-stream deltas and the settle remainder of one call share one accumulation; a marginal debit never credits; the tier still never fires on a run aggregate no single call crossed). The fault kit gains the `tier-crossing-live-parity` scenario (RV1102), pinning both money paths and the marginal live ladder on the real engine.

## 1.138.0

### Minor Changes

- ed0c4fb: Pre-wire continuation reservation, the self-describing fault kit, and the run-id surface (RV1013 + RV1014, PR VII closing the fourteenth plan)

  - Pre-wire continuation admission (RV1013, opt-in). Post-hoc settlement is accounting, not admission: a hard provider RPM cap needs each `pause_turn` continuation reserved BEFORE its egress. With `quota: { reserveContinuations: true }` the engine admits every provider-side continuation through the new adapter-side `StreamHooks` seam (`ProviderAdapter.stream` gains an optional third parameter; the Anthropic adapter honors it): under a 2-request window the third wire of one absorbed dispatch never leaves and the denial rides the provider-429 machinery verbatim, the main settlement stops re-adding individually admitted segments (the window is never double-counted), and a granted admission whose wire never left is RELEASED back to the window through the new optional `QuotaLimiter.release(reservationId)` (implemented by `memoryQuotaLimiter`; a release returns exactly what admission consumed, and unknown or expired ids are no-ops). Adapters unaware of the hook keep the documented post-hoc semantics byte for byte, and the default stays post-hoc. The midstream-versus-finish usage confirmation now fires only when a finish CLAIM exists: an error-terminal absorption (a segment denial, a transport cut) no longer manufactures an invariant violation that shadows the real wire error.
  - The self-describing kit (RV1014). `runFaultInjection` refuses an empty `only` selection typed (a gate that runs zero scenarios used to report `allMatched: true`), and the report carries `requested` and `selected` counts so the gate can never quietly shrink. The audit scenario grows the RV1007 arcs (a page-only long-context tier and a `NaN` scalar are findings, never silent passes), completing kit coverage of every real defect of the fourteenth plan on its real path.
  - The run-id boundary surface (`assertSafeRunId`, `MAX_RUN_ID_LENGTH`) is now exported from `@rulvar/core`, so hosts can pre-validate ids before `engine.run`.

## 1.137.0

### Minor Changes

- 96f6788: Integrity and boundaries: importRun fails closed with rollback, opts.profiles is an enforced allowlist, and a secret-shaped runId refuses at intake (RV1010 + RV1011 + RV1012, PR VI of the fourteenth plan)

  - `importRun` hardening (RV1010). The intake fails closed before the first write: every bundle blob ref must live in the bundle runId's own namespace (`<runId>/...`), so a crafted bundle for run A can never overwrite run B's blobs, and every entry must pass the journal codec's shape validation, so an import never appends garbage it would later refuse to replay. Writes land blobs, then entries, then meta, and a mid-import store failure rolls the partial import back best-effort: the exists-refusal never bricks the retry.
  - `opts.profiles` is an enforced allowlist (RV1011). The advertisement was filtered but the dispatch resolved from the FULL registry, so a spawn naming a registered-but-hidden profile by a guessed name went straight through. The dispatch now resolves from the same filtered set, and with `opts.profiles` passed, a spawn naming anything outside the allowlist refuses with a typed `ConfigError` before admission (no slot burned, nothing journaled); without `opts.profiles` behavior is unchanged.
  - Secret-shaped runId refusal (RV1012). The runId is a correlation key: it rides every event envelope UNMASKED (body masking runs before the envelope is assembled), so a secret-shaped runId was a masking-bypass channel the host created itself. Under an active masking policy, `engine.run` now refuses typed a runId the policy would rewrite (the default credential patterns and any host `redaction.patterns` alike), and `assertSafeRunId` gains a 200-character ceiling (`MAX_RUN_ID_LENGTH`); with `maskEvents: false` nothing is masked anywhere and the check does not apply.

## 1.136.0

### Minor Changes

- aa6ca71: A superseded segment refuses green everywhere: typed SupersededError, the distinct settledReason on run:end, and exactly one authoritative successor (RV1009, PR V of the fourteenth plan)

  The fencing design swallowed a superseded segment's `LeaseHeldError` on both settlement writes, so a stale segment whose settle bounced off the successor's fence resolved `ok` with an unmarked `run:end`: a green terminal that no durable store wrote, exactly the split view the RV907 doctrine forbids.

  - The stale segment now rejects `handle.result` with the typed `SupersededError` (code `superseded`, not retryable, `data { runId, runStatus }`, cause the fencing rejection): the successor owns settlement, and the authoritative outcome is its settle or the store's run meta, never the stale computation. The meta write is skipped instead of re-proving the fence.
  - `run:end` refuses green with `settled: false` and the distinct `settledReason: 'superseded'` (an l0-compatible extension), so an event-only consumer can tell a superseded segment from a settlement write failure; the settlement-failure path and every ordinary terminal keep their exact bytes.
  - A meta-only lease bounce over an already durable settle stays swallowed: the journal records the outcome, and only the projection belongs to the current holder (the takeover no-op contract is unchanged).
  - The CLI progress line renders `settled=false (superseded; the successor owns settlement)` instead of the resume hint, and the OTel exporter stamps `rulvar.run.settled_reason` beside the refused span status.
  - `runFaultInjection` (`@rulvar/evals`) grows the nineteenth scenario, `superseded-terminal-honesty`: the fenced-out segment must reject typed with the distinct reason and zero settle entries, and the successor must settle `ok` by replay with exactly one settle entry and no second paid call.

## 1.135.0

### Minor Changes

- cf75e22: The rates comparator fails closed on page-only tiers and NaN, and the checkpoint decoder honors never-throws on top-level nulls (RV1007 + RV1008, PR IV of the fourteenth plan)

  The fourteenth comparison experiment found two small holes in fail-closed surfaces. `compareRates` ran its tier comparison only when the SEED declared tiers, so a long-context premium the provider's page documents and the seed never declared produced no finding: exactly the silent underpricing channel the comparator's own doctrine names (the RV902 both-directions rule). Its scalar branch compared `Math.abs(a - b) > 1e-9`, and `NaN > epsilon` is false, so a page extraction that stopped parsing read as agreement. And `decodeCheckpoint` let `JSON.parse('null')` through the try/catch, then threw a raw `TypeError` on `parsed.v` out of a function whose documented contract is never-throws (the RV804 fix closed the nested shapes and left the top level open).

  - `compareRates` (RV1007): a page-only tier list is now a finding (`tiers: the page shows N but the seed declares none`; an empty page list claims nothing), and scalars compare in the negated NaN-safe form the tier fields always used, so `NaN` on either side is a finding, never agreement.
  - `decodeCheckpoint` (RV1008): a top-level payload that is not an object (`null`, a primitive, an array) decodes to `undefined` like every other malformed shape; the dangling dispatch reruns from the top, and the malformed corpus runs without a single throw.

## 1.134.0

## 1.133.0

## 1.132.0

### Minor Changes

- 2bec904: Live-budget parity for the cache-write TTL split, and the fault kit gates it on the real live path (RV1001 + RV1002, PR I of the fourteenth plan)

  The fourteenth comparison experiment reproduced a hard-ceiling breach: a run with `budgetUsd: 4` settled `ok` at $4.50, because the mid-stream usage inlet, the reported/remainder fold, and every usage aggregate dropped `cacheWrite5mTokens`/`cacheWrite1hTokens`, so the live ledger priced a differentiated cache write at the plain 5m rate ($3.75) while settlement priced the split ($4.50). The two money paths now read one provider usage identically:

  - The mid-stream cleaner and the finish remainder carry the TTL split to the live debit, so the layer-3 ceiling holds against the same dollars settlement records; a ceiling between the unsplit and split readings severs the run instead of letting it settle `ok` over the ceiling.
  - `@rulvar/core` exports `sumUsage`, the canonical usage adder: aggregates (the run outcome, the settled ledger fold, the budget telemetry, `reduceInvocationTable` buckets) keep the split they were billed under, and an undifferentiated side's writes count as the 5m share so mixed aggregates stay canonical under the split-sum invariant.
  - Mid-stream TTL counts the finish total does not confirm are a usage-invariant violation, loud like every other telemetry anomaly; per-field catch-up over a shifted attribution only ever overcharges, never credits.
  - `runFaultInjection` (`@rulvar/evals`) grows a sixteenth scenario, `ttl-live-budget-parity`: a mid-stream differentiated write against the real engine must debit live and settle to the same $4.50, keep the split on the aggregate, and refuse to settle `ok` under a $4 ceiling. Reverting the fix reports `matched: false` in the kit, not only in the unit suite that shipped it.

## 1.131.0

### Minor Changes

- 256cae1: The thirteenth plan's probes become permanent gates, and the three moneys get their vocabulary (RV909, RV910; closes the thirteenth plan).

  `runFaultInjection` grows eight fail-closed scenarios driving the plan's fixed defects end to end on the real engine, zero provider calls and zero keys: `nan-statement-refusal` (unsummable statement dollars refuse typed at reconciliation intake, never verdict `match` over NaN totals), `token-mismatch-divergence` (provider-reported counts that disagree with our recorded usage decide the verdict even when the dollars agree, with `tokenComparison: 'informational'` still the declared opt-out), `audit-missing-field-finding` (the documented-rates comparator fails closed in both directions), `anthropic-1h-priced` (the shipped Anthropic table prices the 1h cache-write share at the documented 2x-input premium under its pinned `pricingVersion`, on the per-call reconciliation ledger where the TTL split lives), `pause-turn-units` (continuations absorbed into one dispatch settle at true wire units across the quota window, the invoice row's segment set, and the all-or-nothing statement join, with a partial segment set reading `partial-coverage`, never `no-overlap`), `pre-admission-count-refusal` (a spawn the budget could never admit refuses before the `countTokens` egress, so the full child prompt never leaves the process), `forced-finish-completion` (a budget-capped adaptive orchestration settles `ok` with the honest completion envelope mirrored onto the outcome), and `settlement-terminal-honesty` (a failed settlement write rejects typed with `settled: false` on `run:end`; the healed resume re-settles by replay with zero live calls). Reverting any of the fixes now reports `matched: false` in the kit, not only in the unit suite that shipped the fix. To reach those surfaces `@rulvar/evals` gains `@rulvar/openai`, `@rulvar/anthropic`, and `@rulvar/plan` as dependencies.

  `@rulvar/core` publishes `compareRates` (with its `DocumentedRates` input type), the both-directions documented-rates comparator the weekly audit runs: moved from the audit script to a published home so the kit can drive it as a gate, with the script importing the same function from dist inside its entrypoint exactly like the seeds, one source of truth. And the pricing docs now name the three moneys of one run in one place: recorded money (settled history under the `pricingVersion` pins its own settles wrote, the number `CostReport`, `rulvar inspect`, and the invoice's pinned rows show), the docs estimate (repricing at the current table, what `preflightEstimate` projects and the invoice prints past the pins), and the provider bill (established only by `reconcileStatement` over saved exports, never by a dashboard headline), plus the rate-update order: audit, then release, then new pinned runs.

## 1.130.0

### Minor Changes

- d6bec7a: Every tool event names its call (RV908, the thirteenth experiment's OTel attribution risk). `tool:start` and `tool:end` gain `toolCallId`, the model-minted id the journal's messages and tool-result parts have always carried: present on every live event and on every replayed reconstruction (the id rides the checkpoint's tool-result parts, so even journals written before this release name their calls on resume), absent only on streams recorded before RV908 or written by foreign emitters.

  The OTel exporter pairs tool spans EXACTLY by the id (stamped as `rulvar.tool.call_id`), so concurrent same-name calls that finish out of order keep their own durations and outcomes instead of FIFO-swapping attribution. Streams without the field keep the historical FIFO pairing byte for byte, an id-bearing `tool:end` whose start carried no id falls back to the same FIFO (mixed streams pair no worse than before), and the orphan tolerance (a closer with no open start attaches as a span event) is unchanged.

## 1.129.0

### Minor Changes

- 1612439: Honest terminals (RV906 + RV907, the thirteenth experiment's release risks six and seven): a forced finish names itself partial, and a failed settlement is never a green event.

  RV906: under the default `budget.atCap: 'finish-with-partial'`, the capped terminal's value becomes the completion envelope `{ result, completion }`, and the literal is `'partial'` unless the finalizer's finish provably passed the FULL declared contract: the declared finish validators now BIND the reserved finalizer (on capped runs synthesis never runs, so that finish is the final output they must judge; a finish they reject never becomes the run value and the deterministic fallback settles the run), while a declared acceptance policy is still never judged at the cap, so with one declared the terminal stays `'partial'`. The finalize fallback's synthesized partial carries the same `completion: 'partial'` claim on its `exhausted` outcome. The engine lifts the literal onto `run:end` and the outcome mirror, so a consumer reading only `status` can no longer execute a truncated plan as a full success. The journaled finalize effects also roll forward on resume: a settled capped run reuses its recorded finalize terminal (or fallback decision) instead of re-deriving the prompt from the drifted live digest, which used to mint a fresh agent identity and re-pay the reserve on every resume of an already settled capped run.

  RV907: `run:end` gains `settled: false`, present ONLY when a settlement write failed (the `run_settle` journal append or the terminal `RunMeta` projection): the status stays true as computation, but nothing durable records it and `handle.result` rejects with the typed `SettlementError`, so an event-only consumer is refused the green terminal exactly like the rejected promise. The CLI progress line appends `settled=false (outcome withheld; resume re-settles)`, and the OTel exporter stamps `rulvar.run.settled: false` and refuses the OK span status. The order stays warn, then the marked `run:end`, then the throw; a healed resume re-settles by replay with zero paid calls and its terminal carries no field, byte for byte like every ordinary run.

## 1.128.0

### Minor Changes

- 27c4e38: pause_turn continuations become accounted wire units (RV905, the thirteenth experiment's fifth release risk). The Anthropic adapter absorbs server-side turn pauses by re-sending, making up to six wire requests inside ONE core dispatch; until now the request quota window, the provider call record, and the invoice row all saw one, and a per-request provider statement matched one segment while the rest read statement-only.

  The adapter's finish metadata now names the whole segment set (`providerMetadata.anthropic.wireRequests = { count, responseIds }`); the provider call record and the invoice row carry `wireResponseIds`; and the quota reconciliation settles the reservation against the TRUE wire request count. The `QuotaLimiter.reconcile` SPI gains an optional `actual.requests` argument, honored by all three reference limiters through one shared arithmetic (`quotaActualRequestsDelta`), so a window that admitted one request per reservation now reflects what the provider's own RPM meter saw; a settlement only ever adds, never denies retroactively, and implementations written against the two-argument form remain valid. `reconcileStatement` joins a multi-wire invoice row by ANY id of its segment set, all-or-nothing: a partially delivered segment set reads `partial-coverage` with its delivered segments never counted as statement-only (and never `no-overlap` when segments touched our data), and provider-reported token counts compare as the SUM over the segments against the dispatch's recorded usage. Single-wire dispatches carry none of the new fields and stay byte-identical, journals and events included.

## 1.127.0

### Minor Changes

- b3b1805: Admission before egress for the pre-dispatch token count (RV904, the thirteenth experiment's pre-admission egress probe). ctx.agent calls the adapter's optional `countTokens` with the FULL child prompt to tighten the admission reserve; before this release that network call ran before the budget decided anything, so a spawn the budget could never admit still sent the prompt to the provider, the call honored no abort signal, and nothing observable recorded the egress.

  The reserve is monotone in the count, so the smallest reserve any count outcome could produce is computable without it: the priced floor at zero input tokens, or the flat fallback the count-failed path admits under. The engine now checks that floor against the budget first, through the exact refusal arithmetic `admitSpawn` itself uses (`RunBudget.refuseSpawnIfInfeasible`, the refusal arm factored out so the two layers can never disagree), and a spawn that could never be admitted (the lifetime spawn cap, a full account, an exhausted ceiling) refuses with zero network calls. The provider SPI's `countTokens` gains an options argument with an `AbortSignal`; the Anthropic adapter threads it into the SDK request, and an abort mid-count cancels the spawn instead of silently falling back to the flat reserve and dispatching behind a cancelled spawn. Every count is now observable: an `admission.countTokens` info log names the model and the counted tokens, and a failed count warns with the failure the flat reserve then covers. An explicit `estCost` (per call or per profile) remains the zero-egress path that skips the count entirely, now documented as the posture for hosts whose privacy gates must run before any prompt byte reaches a provider. Spawns on adapters without `countTokens`, and spawns carrying `estCost`, behave byte-identically to v1.126.0.

## 1.126.0

## 1.125.0

## 1.124.0

### Minor Changes

- 37fd1f2: The twelfth plan's closing trio (RV809, RV810, RV811). The tool budget extension gains `coverEvidenceDeficit`: with an evidence contract declared, the extension grants at a tool-turn boundary whenever the remaining call budget cannot cover the declared floor's outstanding deficit, under the same money, progress, and maxExtensions gates, so a limited child at 7 of 11 entries converts headroom into the missing evidence BEFORE the cap instead of dumping through the reserved tail; the journaled grant decision carries `trigger: 'evidence-deficit'` and the announcement names the exact deficit. Canonical Usage gains the optional cache-write TTL split (`cacheWrite5mTokens` and `cacheWrite1hTokens`, invariant: the split sums to `cacheWriteTokens`); `priceUsdOf` bills the 1h share at `cacheWrite1hUsdPerMTok` with everything unclaimed at the plain write rate (byte-identical arithmetic without a split), sanitize repairs broken splits with 1h priority (never an undercharge), and the Anthropic adapter fills the split from the `cache_creation` breakdown when it agrees with the flat total. @rulvar/evals gains the fault-injection kit: `runFaultInjection` drives the never-observed-live fail-closed branches (in-flight-exposure refusal, duplicate quota rule, torn and glued JSONL tails, the settle-boundary crash resume, pricing rotation with an uncovered tail, unknown provider id) on the real engine offline, verifies each documented typed observable fail closed, and leaves experiment-grade artifacts.

## 1.123.0

### Minor Changes

- 5c46468: Sectional bounded repair and the structured evidence index (RV808b, the second half of the split RV808). `finishValidation.sectionalRepair: { sections }` teaches every gated finish a second repair shape: after a rejection the model resubmits ONLY the repaired sections as `finish({ sections })`, and the host splices them into the retained rejected attempt (the exported `spliceSections`, line anchored, missing declared sections append) and validates the reconstructed document whole; the synthesis invocation is seeded with the coordination draft as its retained base, so with `carryDraftGaps` the post-fan-in window collapses to one small patch instead of a full re-derivation. Mechanics refusals are typed, journal nothing, and spend no repairs; the gated invocations' finish tool schema moves only under the opt-in. `synthesis.evidenceIndex` adds a deterministic `EVIDENCE INDEX:` prompt line (per settled child: the distinct citations its output carries, evidence-pool children only, artifacts, chars, the handle when the read tools are exposed), so the composing model pages exactly what it needs instead of re-reading the whole pool; replay-stable, fail-closed pattern intake, byte identical when unset.

## 1.122.0

### Minor Changes

- 8cf45c5: The post-fan-in double rework closed at its cheapest point (RV808a, the first half of RV808). The twelfth comparison run paid 80.157% of wall time AFTER fan-in: the coordination draft was repaired only against the weak `draftPolicy` subset, the `skipWhenDraftValid` pre-pass then judged it by the FULL contract and failed, that verdict was silently discarded, and the synthesis invocation re-derived the whole document blind to the known defects and failed the same contract once more itself. Two opt-ins close the loop. `finishValidation.draftPolicy: 'contract'` gates the coordination draft by the full declared validator set (same validators, same children snapshot the synthesis-bound validation reads), with rejection feedback naming the failing validators, so the coordination repair loop drives the draft toward exactly what the pre-pass will judge and the skip becomes reachable; the preflight `draft-gate-below-contract` warning cannot fire under it, and the preflight input type accepts the sentinel. `synthesis.carryDraftGaps: true` (requires `skipWhenDraftValid`) journals a failing pre-pass as an `orchestrator_synthesis_draft_gaps` decision (failed validator names and reasons, bound to the contract generation and draft hash exactly like the skip decision) and feeds the synthesis prompt a `DRAFT CONTRACT GAPS:` line instructing it to repair the named gaps and preserve the draft otherwise; a resume reuses the journaled verdict without re-running a validator, so prompt bytes re-derive identically and the paid invocation replays. Both default off: journals and prompt bytes stay byte-identical without them. The sectional bounded repair and the structured evidence index (RV808b) follow separately, and the live acceptance measurement of the post-fan-in share stays gated on an explicit founder go.

## 1.121.0

### Minor Changes

- 3d67d41: Rate provenance made checkable (RV807, RV813, RV814). The pricing row grows `ratesVerifiedAt` (SPI), the ISO date it was last verified against the provider's documented rates or, stronger, its billing categories: the shipped seeds stamp it (the GPT-5.6 family reads `2026-07-30`, the day the statement reconciliation confirmed those rates against the provider's own per-component billing categories to the cent; the pre-5.6 OpenAI rows keep their `2026-07-18` docs verification; every Anthropic row was re-verified against the documented table on `2026-07-30`). The date is surfaced wherever a dollar is consumed: `preflightEstimate` copies it onto each spawn report and `rulvar preflight` renders `ratesVerified=<date>` with its age on the spawn line; the settle pin journals it with the rest of the applied row so it survives any later table rewrite; and `rulvar invoice` prints a `rates verified:` line naming each priced model's date and age, pinned rows first, current table past them; the twelfth run's founder read the invoice doubting the rates and nothing said the seed was 12 days stale. The doctrine ships with the mechanism: seeds bound ceilings conservatively, billing truth is established only by `reconcileStatement` over saved exports, and a confirmed divergence corrects the seed in its own release with a changeset, never a silent rewrite. Enforcement rides two new gates: a weekly documented-rates audit (`scripts/rates-audit.mjs` in the live contract workflow) re-fetches exactly the pages the seed comments cite, compares every rate, write premium, and long-context tier, and opens an issue on drift or on a page that stops extracting, and a README release-table gate (`scripts/readme-release-shas.mjs`, in CI) requires every cited squash SHA to be an ancestor of HEAD, catching the v1.109.0 row that pointed at an object no branch contained for eleven releases (now corrected to the real squash `58afdb5`).

## 1.120.0

### Minor Changes

- d630c9e: The partial fan-out contract and the per-child acceptance roster (RV805, RV806). `parallel_agents` admits children sequentially in submission order, and a mid-loop admission refusal is now part of the TYPED tool result instead of a throw: the model keeps every started handle (awaitable and cancellable), and `refused` names the failed index, the typed error code, and the reason; a thrown refusal used to swallow the whole call while the started children kept spending invisibly, inviting a duplicate wave. The clean-wave result stays byte for byte `{ handles }`. The acceptance fold now journals a per-child machine roster inside its single decision and carries it as `acceptanceChildren` on the envelope, the `RunOutcome`, and `run:end` (same lift and malformed-drops-silently posture as the salvage lists, mirrored to OTel as `rulvar.run.acceptanceChildren`): each spawned child with its settled status, the salvage arm that accepted it, and, where the child declared an evidence contract, the evidence verdict `{ recordedEntries, minEntries, met }` with `waivedBySalvage: true` on a below-floor child a salvage arm accepted anyway; the twelfth comparison run accepted two below-floor children through salvage and nothing machine-readable said so. Behind it, a declared evidence contract now stamps EVERY settled `AgentResult` with `evidence` (the same window-derived count as the enforce-refuse floor), absent without a contract so those results stay byte-identical. `rulvar inspect` prints the acceptance verdict with the completion, the salvage lists, and the per-child evidence verdicts from the journaled decision, plus journaled `quota_drift` decisions labeled per-minute window, not cumulative. The guides now state the gating rule outright: gate on the (`status`, `completion`) pair, never on `status` alone.

## 1.119.0

### Minor Changes

- 1e4ff3c: Validation symmetry closes two crash-shaped gaps the twelfth experiment found (RV803, RV804). `preflightEstimate` now validates `run.budgetUsd` with the same typed guard the runtime applies to `RunOptions.budgetUsd`: a NaN, negative, or infinite ceiling refuses as a ConfigError naming `preflight.run.budgetUsd` instead of flowing silently into every projection the report is built from; preflight already validated `run.limits`, `run.maxInFlightExposureUsd`, and every spawn budget, and the run ceiling was the one raw read left. `decodeCheckpoint` now validates the nested message structure: a parseable blob whose messages are malformed (`{v:1,messages:[{}]}`, a message without a string role, a non-array `parts`, a garbage part) returns undefined per the function's own undefined-on-unparseable contract, so the dangling dispatch reruns from the top, instead of throwing a raw TypeError out of `msg.parts.map` mid-resume. Well-formed checkpoints round-trip byte for byte as before, and both refusal shapes carry mutation-probe entries.

## 1.118.0

### Minor Changes

- f8341a3: Provider statement reconciliation as a machine (RV812, the twelfth experiment's billing lesson). The run's billing question (a dashboard headline of 4.45 then 4.77 USD against the settled 7.304885) was closed by hand with screenshots; nothing in the system could close it. Now `@rulvar/openai` exports `reconcileStatement(invoice, statement, { pricingOf })`: it joins the machine-readable invoice against a NORMALIZED provider export, per-request rows by response id or per-model per-component category totals (the Spend categories shape), and refuses a headline aggregate typed, because an eventually consistent dashboard total is not evidence. The report carries response-id coverage (a partially delivered export reads as `partial-coverage`, never as false divergence: component deltas fold over the covered subset only), per-component deltas per serving model, and the implied actual rate of every component beside our effective rate over the same token base, so a real divergence NAMES the rate-card line that moved with the rate the provider actually applied. Unpriced models and usage-unknown rows are declared apart, never folded or silent; verdicts are `match`, `divergence`, `partial-coverage`, `no-overlap`. Backing it, `@rulvar/core` exports `priceComponentsOf(pricing, usage)`: the four billing components (uncached input, output, cached input, cache writes) with token bases and dollars, decomposed with exactly the settled fold's arithmetic; `priceUsdOf` is now defined as the sum of those four terms in the historical order, byte for byte the same number, so the reconciliation and the settled fold can never disagree about what a usage costs. Validated against the real twelfth-run artifacts offline: the founder's eight dashboard categories reconcile to `match` with every delta under 0.0005 (3-decimal rounding), response-id coverage reads 120 of 120, a 100-row truncation reads partial coverage with zero divergence, and a synthetically distorted write rate names `gpt-5.6-terra cache-write` with implied 2.5 USD/MTok against effective 3.125.

## 1.117.0

## 1.116.0

### Minor Changes

- a213878: One settled number on every public money surface (RV801, the twelfth experiment's P0). `run:end` now spreads `outcome.cost.totalUsd` itself, so the terminal event and the settled report cannot disagree under any pricing table; live in the twelfth comparison run the event said 10.4148235 USD against 7.304885 USD on every other surface, because the kernel ledger re-priced per-phase usage aggregates through the 272k long-context tier no single request crossed. `Replayer.ledger()` folds dollars on the settled billing basis (RV504): per provider call where an entry's dispatch records cover its usage, the per-slice aggregate otherwise; usage sums and the spawn count are unchanged. The resume budget seed is the settled fold too, per-call basis composed with the per-segment pricing pins (RV505), so resuming a tier-heavy run no longer inherits aggregate-priced dollars and falsely exhausts a ceiling the real spend never crossed (the escalation on the experiment's finding: that exact journal would have resumed with 10.41 of a 10.00 ceiling already counted as spent), and a resume across a price-table rotation starts from the figure the prior segment actually reported instead of re-pricing settled history at the rotated rates.

## 1.115.0

### Minor Changes

- 63642ae: Post-fan-in attribution and the opt-in in-flight exposure cap (RV710, RV711). `reduceCriticalPath` now decomposes the post-fan-in window whenever it exists: `CriticalPath.postFanIn` folds the coordination spans' model activations and tool executions (by tool name, so child-result pagination and the finish exchanges show up under their own names) and the `synthesize` span wall, each clipped to the window, with `coveredMs` as the exact interval union and `residueMs`/`residueShare` naming what no recorded interval covers, from the same event vocabulary with no new types. `RunOptions.maxInFlightExposureUsd` bounds spent money plus the summed worst-case estimates of live dispatches: the admission holds each turn's own estimate from right before the provider call until the attempt settles, refuses the dispatch whose estimate does not fit with a typed `BudgetExhaustedError` (`data.reason 'in-flight-exposure'`) instead of waiting, and thereby bounds the worst concurrent overshoot to the estimate error of the in-flight turns instead of one whole turn per agent; off by default with byte-identical wire traffic, and preflight reports a configured cap as the `in-flight-exposure-cap` finding.

## 1.114.0

### Minor Changes

- 5759731: The fixed-window quota boundary is pinned as a named compromise, and the final model can opt into the run's own observed evidence (RV708, RV709). `QuotaRule` and the model-routing guide now name the window semantics exactly: every PerMinute cap counts over fixed epoch-aligned 60 s windows, each window enforces its cap exactly, and a burst placed astride a boundary can consume up to two caps inside one sliding 60 s, the bounded price of cross-process parity, pinned by test as intended behavior with no semantics change. `runAgent` gains the opt-in `policyFacts`: the finalize synthesis request carries ONE additional request-only message digesting what the loop observed (quota denials and recoveries, tool budget pressure and extension grants, the finalization window, recorded spend with its cost basis), never touching the durable transcript or spawn identity; `orchestrate` gains the symmetric `synthesis.policyFacts`, a deterministic `POLICY FACTS:` prompt line folded only from replay-stable settled child facts (statuses, extension grants, finalization windows and reserves), so a resumed synthesis re-derives identical prompt bytes. Both are off by default and every request and prompt stays byte identical when unset.

## 1.113.0

### Minor Changes

- a60807a: The pricing composition's second half names itself, and the effect-ledger quarantine is byte-true (RV706, RV707). `InvoicePricingProvenance` gains optional `currentPricingVersion`: on composed exports it is the version of the caller's current table, the one that priced everything past `pinnedThroughSeq` (on current-table exports, the whole fold), so an invoice folded across a rotation now names both halves of the composition where the pinned segments already declared theirs; `rulvar invoice` and `rulvar inspect` fill it from the configured table and extend their text suffix to `pins composed with the current table (v-a, v-b; current v-live)`, byte for byte unchanged when the config declares no version. The executor ledger's torn-tail quarantine row now carries `bytesBase64` and `sha256` of the exact torn bytes alongside the lossy `bytes` string kept for old readers (two different byte tails used to collapse into one indistinguishable row), and the repair's parseable decision is made on the bytes, strict UTF-8 before `JSON.parse`: the lossy decode could make a fragment with invalid bytes inside a string literal parse, and the repair then terminated a line of invalid bytes in place, manufacturing exactly the corruption the fail-closed scan refuses.

## 1.112.0

### Minor Changes

- 00ae55b: Duplicate quota rules are refused at construction in every reference limiter (RV704). `snapshotQuotaRules`, the shared construction chokepoint of `memoryQuotaLimiter`, `SqliteQuotaLimiter`, and `PostgresQuotaLimiter`, now throws a typed `ConfigError` naming both indexes and the canonical `quotaRuleKey` when a rule set contains two identical rules. Before the refusal, the same duplicated configuration admitted differently per storage: the memory reference buckets by rule index, so each copy counted independently and the full cap admitted, while the store references bucket by rule key, so one shared bucket was debited once per matching copy and half the cap admitted (a cap-4 set granted 4 in memory and 2 on sqlite), breaking storage parity with a configuration nothing had refused. `@rulvar/store-conformance` gains `quotaRulesConformance`, the executable construction contract any limiter implementation can register.

## 1.111.0

### Minor Changes

- fd25169: A covered model's invoice rows are now exactly its recorded provider calls (RV703). Coverage is decided per model (RV604), but the remainder pass subtracted records per model AND role, so a covered model whose record roles differed from its slice roles (the schema-extract default splits one model's usage by role while the record carries one role, or none) fabricated a phantom `unattributed` remainder row: the export then carried more tokens than the run used, `sum(rows[].usd)` exceeded `totalUsd` under a `rowUsdNonAdditive: false` promise, and the allocation pass siphoned dollars from the real call's row onto the phantom. `invoiceFromJournal` now skips the per-slice remainder arithmetic entirely for models the billing fold covered; uncovered models keep the historical per-slice remainders byte for byte. `EntryBillingFold` publishes the fold's per-model coverage decision as `coveredModels`, so row builders honor the same decision instead of recomputing it under a different key.

## 1.110.0

### Minor Changes

- 58afdb5: Price the live and replayed event telemetry per provider request, exactly like the settled fold, and label every money-bearing event with its basis (RV702).

  The eleventh comparison experiment measured the defect live: `agent:phase:end` priced the phase-aggregate usage delta in one call, so a nonlinear long-context tier fired on aggregates no single request crossed; `agent:end` and `reduceInvocationTable` inherited the inflated dollars (raw sum +60.2%, loop bucket +82.9%) while the settled CostReport and invoice priced per request (RV504). Now every recorded provider call is priced individually at its own chokepoint, phase events carry the delta of that per-call accumulator, `agent:end` carries its sum, the replay path folds the terminal entry through the same `priceEntryBilling` the invoice uses, and the reducer's rows and `byRole` buckets match the settled fold whenever records cover the usage.

  New `costBasis: 'per-call' | 'aggregate-estimate'` on `agent:phase:end`, `agent:end`, `AgentResult`, and the reducer's rows and buckets: `'aggregate-estimate'` appears only where per-request records cannot cover the number (a checkpoint written before the reconciliation ledger shipped restores usage without call records; the invocation total then keeps the aggregate-priced figure, labeled, instead of silently dropping restored spend), and the reducer defaults an absent field to `'aggregate-estimate'`, never to a per-call claim the stream cannot back.

## 1.109.0

### Minor Changes

- 85b1d39: Close the two fail-closed gaps the eleventh comparison experiment proved live (RV701, RV705).

  RV701, `JsonlFileStore`: a crash that persisted every JSON byte of an append but not its trailing `\n` left a parseable unterminated tail; `load` served it, the next `append` glued the following record onto the same line, and the load after that classified the glued line as one torn fragment and repaired BOTH accepted records away (a first-line glue rewrote the journal to zero bytes; a later second append buried the glue mid-file and made the journal unreadable). `append` now terminates a parseable unterminated tail in place before this instance's first write, and torn-tail repair salvages every complete record a glued last line carries, discarding only the unacknowledged trailing fragment. An entry `load` has served once can no longer be un-served by a later repair.

  RV705, `buildCostReport`: the exported live builder returned whatever numbers the host fed it, so an `Infinity` or `NaN` total, bucket, or abandoned ledger serialized into `null` downstream, while `costReportFromJournal` had refused exactly that since RV610. The builder now runs the same deep finite validation and refuses non-finite reports with the same typed `ConfigError`.

## 1.108.0

### Minor Changes

- affa3d4: Stored consumers compose the pricing pins exactly like the engine, and the invoice provenance declares every pinned version (RV611).

  `JournalPricingSnapshot` exports the composition the engine's outcome mirror applies at settle: `composedPriceUsd(current)` prices pin-covered rows at the rates their own settle recorded and everything past the last pin (a segment journaled but never settled) at the caller's current table. The engine now consumes the same method, and the three stored consumers (`rulvar inspect`, `rulvar invoice`, the server's stored-run cost endpoint) fold through it instead of passing the raw snapshot, which silently priced the tail at the last pin's rates and folded never-pinned models as unpriced even when the current table knows them. Two fallbacks stay deliberate and documented: a covered model its covering pin missed back-reprices at the last pin when that pin names it, and a model no pin resolves falls to the current table.

  The snapshot also carries `segments` (every pin's seq boundaries, `pricingVersion`, and rows in journal order), and `InvoicePricingProvenance` gains the `'composed'` source plus `segments` and `pinnedThroughSeq`, so an invoice folded across a price-table rotation names every version that priced it instead of hiding the rotation behind the last one. The CLI exports that priced through a pin now declare `source: 'composed'` (previously `'snapshot'`), and the `pricing rates:`/`pricing:` text lines name the composition and every pinned version.

## 1.107.0

### Minor Changes

- 9f5f6f6: Fail the evidence-preservation contract closed at intake and refuse non-finite accounting anywhere in a public report (RV610); the exactly-once claim sentinel now judges normalized prose blocks and the guarantee matrix states the two-phase row shape honestly (RV612).

  `evidencePreservedValidator` intake is fail closed: a pattern that can match the empty string is refused with a typed `ConfigError` at construction (an empty match would enter the citation pool as fabricated evidence, trivially "preserved" by every result and defeating `requireNonEmptyPool`), zero-length matches never enter the pool even when a lookaround produces them in context past the construction probe, and `requireKnown` and `requireNonEmptyPool` must be real booleans, so a stray `'true'` or `1` can never silently disable the strict mode it names.

  Accounting refuses non-finite numbers at every layer: the per-entry price folds (`priceEntryUsage`, `priceEntryBilling`) throw a typed `ConfigError` the moment individually finite prices overflow the running sum, and `costReportFromJournal` and `invoiceFromJournal` walk their finished public objects and refuse any `Infinity` or `NaN` before returning, because JSON serializes both as `null` and a published report that quietly carries `null` where dollars belong is silent telemetry corruption. Previously two individually valid `Number.MAX_VALUE` prices produced `totalUsd: Infinity` and `allocatedUsd: NaN`.

  The docs claim sentinel (RV508) now normalizes contiguous markdown prose and source comment blocks before matching, so a forbidden claim wrapped across a line break or spaced with double whitespace is caught at the block's first line, and the prior shipped recurrence "each ran once" is recognized as the same claim; the (file, anchor) allowlist is unchanged. The widened rule immediately caught one live wrapped occurrence in a core comment, which is rewritten with the precise guarantee. The guarantee matrix's effect-accounting cell no longer contradicts the ledger format: a completed two-phase attempt has TWO rows (intent and outcome, one `attemptId`), a crash between the phases leaves the intent row alone as the orphan, and the legacy no-intent ledger keeps its one-outcome-row contract.

## 1.106.0

### Minor Changes

- 9a4ce49: Alias recovered child attempts by admission identity, so a restored coordinator's old handles reach the reborn attempt (RV609).

  The handle-stability alias required the old and new running entries to share `(scope, key, ordinal)`, but occurrence ordinals are strictly monotonic per `(scope, key)`: a rerun always takes the NEXT ordinal, so the alias was unreachable for ANY rerun, not just a cancelled child. A restored coordinator transcript that kept calling the handle it saw (`await_all`, `cancel_agent`, `get_child_result`) got `unknown handle` repair turns instead of the reborn attempt and could exhaust before the acceptance policy or the `minSpawnedChildren` floor (RV507) was ever evaluated. The seam predates the ninth plan: it shipped in v1.7.0.

  Recovery now aliases by what is actually stable, the admission identity: every prior attempt's RUNNING row of the redispatched admission's `(scope, key)` under the pinned child scope aliases to the reborn record (every handle is a running row's seq, so the claimable set is exactly the prior running rows; a terminal is a separate row and never a handle). A transiently claimed same-key sibling is content-interchangeable and is rebound the moment its own redispatch lands. Because several handles can now map to one record, every roster-shaped walk (wake digests, quiescence, finish-validation children, the forced-finish fold, incremental synthesis reconciliation, the acceptance decision, and the synthesis digest, now one row per spawn under its current handle) iterates the per-spawn-ordinal roster instead of the handle map, so an aliased child is never counted or digested twice. Without aliases the per-spawn walks are byte-identical to the old per-handle ones, so synthesis prompt bytes and existing journals roll forward unchanged.

  Fresh runs are byte-identical; the change is confined to recovery. Also freezes the clock in a real-clock store-postgres test that could straddle a minute boundary in CI (test-only).

## 1.105.0

### Minor Changes

- 531dc88: Make quota rules an immutable snapshot with a canonical denial order in all three limiters, and give the postgres limiter rotation generations, a fenced stale host, a bounded bootstrap, and strict intake (RV608).

  Immutable snapshot (all three limiters): `memoryQuotaLimiter`, `SqliteQuotaLimiter`, and `PostgresQuotaLimiter` now admit under the new exported `snapshotQuotaRules(rules)`: a validated, frozen copy carrying only the known rule fields, taken at construction. Mutating the caller's array or rule objects afterwards (a pushed rule, a reassigned cap) can no longer change a decision, a bucket key, telemetry, or the fingerprint the postgres schema records; previously the caller's live graph was read on every admission and the fingerprint was computed lazily from it at first boot. The canonical per-rule content key is also exported as `quotaRuleKey`, and every limiter folds a denial over matching rules in that canonical order, so permuted but identical rule sets now produce the byte-identical refusal object (reason and retryAfterMs), not just the same fingerprint.

  Rotation generations (postgres): `rulvar_quota_meta` now records a rules generation beside the fingerprint. Every admission re-reads both inside its own locked transaction and, on a mismatch, is refused with the new typed `QuotaGenerationError` instead of admitting under retired bucket keys, so a host that booted before a rotation is fenced rather than silently splitting the budget; its next call re-boots into the honest boot-time `ConfigError`, and its outstanding reservations age out with their window. Rotation (`acceptRulesUpdate: true`) now serializes with in-flight admissions on the same advisory lock, bumps the generation, and carries current-window consumption conservatively: a new bucket inherits the retired bucket's counters for the same `(provider, model, tenant)` dimension triple (the maximum when several retired rules share it), so a raised cap grants only the difference, a lowered cap counts what was already consumed, and a genuinely new dimension starts empty. The carry decision is conservative by design: estimates held by fenced hosts settle nowhere and age out, which errs toward under-admission inside the rotation window, never over.

  Bounded bootstrap and honest deadline phases (postgres): the bootstrap transaction now runs under the same `SET LOCAL lock_timeout` as admissions (a held boot lock used to wait unboundedly), and its connection is registered with the full-path deadline, which destroys it on expiry so an abandoned bootstrap can never commit DDL or a rotation after the caller was already refused. `QuotaDeadlineError.phase` gains `'bootstrap'`, and each phase's message now narrates only what actually happened: an `'acquire'` refusal held no connection and no longer claims one was destroyed.

  Strict intake (postgres): `acceptRulesUpdate` is runtime-checked as a real boolean (the string `"false"` used to enable rotation by truthiness), and `admissionDeadlineMs` is refused above the Node timer maximum (2147483647 ms, now exported from `@rulvar/core` as `MAX_TIMER_DELAY_MS`) before the pool is constructed; above it, the deadline timer used to clamp and refuse every admission after about a millisecond.

  Migration note: hosts running mixed rule sets over one schema now fail loud during a rotation instead of silently splitting the budget: old booted hosts receive `QuotaGenerationError` on their next admission the moment a new deployment boots with `acceptRulesUpdate: true`. That refusal is the designed rollout signal, not a regression; roll the refused hosts to the new rule set and remove the flag. Existing recorded fingerprints keep matching (the key encoding is unchanged), and pre-generation schemas are backfilled to generation 1 on the first matching boot.

## 1.104.0

## 1.103.0

### Minor Changes

- f2b809e: Symmetric billing coverage and the per-slice invoice residual (RV604, RV605: the round-52 accounting P1s).

  **Coverage is decided per model with a symmetric key (RV604).** The per-call billing fold compared each usage slice against the per-MODEL sum of the provider-call records, while the slices split one model's usage by role. Several roles on one model, which is the DEFAULT configuration under a schema (the same-model extract), therefore always refused coverage and re-priced the aggregate, firing nonlinear long-context tiers no single request crossed: the audit reproduction turned 700 honest monetary units into 1900 while the live ceiling had debited ~700. Both sides now aggregate by serving model, coverage is decided per model, a covered model prices each of its records individually (the role rides the record, so byRole survives), and an uncovered model honestly keeps the aggregate basis. `fullyAttributed` is true exactly when every slice model is covered and no record names a model absent from the slices. The engine-level coherence obligation gets its own test: on a fully attributed multi-role run under a tiered table, the settled fold equals what the live ceiling debited.

  **The invoice residual is computed per slice (RV605).** The unattributed remainder used to be one whole-entry row published under `entry.servedBy`: a slice of another model with no records left its allocation pool rowless, and the dust pass dumped that model's whole USD onto the largest row of a different model so the column would sum. The remainder is now computed per usage slice, subtracting only the records of the slice's own serving model (and role, when the slice carries one), and each non-zero remainder becomes a row under that slice's model and role. The dust pass refuses to transfer a target into a pool with no rows: the amount is excluded from the reconciliation and declared in the new `unallocatedUsd` field (absent when zero, which is every well-formed journal), so cross-model transfer is structurally impossible and additivity is honest rather than forced.

## 1.102.0

### Minor Changes

- 3eb6515: Durable authorization before the authorized effect (RV601, RV602, RV603: the round-52 review of the ninth plan's own surface).

  **A tool budget grant is durable before it takes effect (RV601).** The grant and finalization-window decision entries introduced by RV509 were journaled fire-and-forget, so a tool call could run under a raised cap whose authorizing decision never reached the store, and a rejected append left the run settling with the decision silently absent. Both hooks on `RunAgentOptions.toolBudgetDurability` now return `Promise<void>` and the loop awaits them before the grant lifts an expiry, before the window binds a call, and before either announcement is queued. A refused append issues no grant and marks no entry, and the failure propagates exactly like a failed boundary checkpoint instead of being swallowed. Migration: a host wiring these hooks directly must return a promise, and a grant can now fail when the journal store is unavailable rather than proceeding unrecorded.

  **The journaled cap anchors a resumed ceiling (RV602).** `maxToolCalls` and `increment` are not part of the dispatch identity, so a host may legitimately change them between segments; recomputing the resumed cap from live limits revoked a raise the model had already been promised on the live-resume path while a pure replay honored it from the journal. `toolBudgetDurability.restored` now carries the journaled `cap`, the loop measures from it, and grants taken after the restore point apply the current `increment` to that anchor. A restored cap that is not an integer at or above the base cap is ignored with a warning, leaving the executed-call derivation as the floor.

  **A synthesis skip is bound to its contract generation and draft (RV603).** The `orchestrator_synthesis_skip` decision written by RV510 was looked up by scope and key alone, so the documented fix-and-resume remedy was defeated: a crash between the skip and the run settle, followed by a contract fix, resumed with the stale skip and settled `ok` carrying output the current contract rejects. The entry now records the contract hash (when a `finishValidation.contract` is declared) and the hash of the draft it judged, and is reused only when the contract generation, the draft, and the validator names all still match; otherwise the gate re-runs on the current contract. Without a contract descriptor the binding falls back to draft plus validator names, which is honestly weaker and documented as such. Entries journaled before this field existed stay reusable, so runs in flight roll forward unchanged.

## 1.101.0

### Minor Changes

- 51b215c: Conditional synthesis (RV510, the ninth-experiment review): the opt-in `synthesis.skipWhenDraftValid: true` runs the coordination draft through the FULL declared finish contract before the synthesis span starts. A draft that passes every validator becomes the final result without the synthesis invocation ever dispatching, under a journaled `orchestrator_synthesis_skip` decision with the new machine-readable reason `synthesis_skipped_by_valid_draft` (the existing `OrchestrateSynthesisSkipReason` vocabulary, additively extended); the info log and the acceptance envelope carry the same reason, and a resume rolls the journaled skip forward with zero paid calls. A draft that fails any validator goes to synthesis exactly as before, with the repair budget untouched. Deterministic by construction (only the declared contract judges, no semantic-delta heuristic); requires `finishValidation` at intake; default off, byte-identical journals and cassettes.

## 1.100.0

### Minor Changes

- 9785bea: Durable parallel of the ToolBudgetSummary (RV509, the ninth-experiment review): an adaptive tool-budget extension grant and the finalization-window entry now journal as decision entries of the existing vocabulary (`tool_budget_extension`, `finalization_window_entry`), bound to the agent dispatch by targetRef the moment each fires. A crash-resume restores the granted cap and the window-entry fact from the journal, so a granted-but-unspent extension is honored instead of silently revoked (the conservative executed-call derivation stays as the floor beneath a lost journal tail) and `finalizationWindowEntered` stays truthful when a later grant moved the counts back out of the window. A replayed result now carries the journal-backed summary subset (`used` from the terminal checkpoint, the granted cap, `extensionsGranted`, `finalizationWindowEntered`) with zero provider calls. Pressure notices stay events, grant-free runs journal nothing new, and their journals and cassettes remain byte-identical.

## 1.99.1

### Patch Changes

- ef08d73: Guarantee matrix and exactly-once claim hygiene (RV508); no runtime behavior changes. The isolated-executor guide now carries the guarantee matrix stating flatly who provides what: the library's layers give at-least-once execution with attempt binding and intent-before-effect, exactly-once effect execution is promised by NO library layer, and what IS exactly-once is pay and replay (the never-pay-twice invariant). The two claims the ninth comparison experiment's judge caught are rewritten to the precise statements ("each ran once" became attempt counting under a stable idempotency key; the approvals guide now says continuation is a run-level guarantee, not an effect-level one, with the at-least-once window named); `ctx.step` docs state the same window for effectful steps; a `ResolutionBy` note says the field records a channel, never a verified principal (identity, signatures, and separation of duties are host IAM). The worker header now points at the shipped `SqliteQuotaLimiter` and `PostgresQuotaLimiter` instead of denying that cross-process limiters exist. A new docs-lint sentinel forbids "exactly once" claims in the hand-written docs and in package source comments outside a vetted (file, heading anchor) allowlist (the durability pay doctrine and the guarantee matrix), and every remaining occurrence in doc prose and source comments was rewritten to the precise wording; string literals are deliberately out of scope (tool descriptions enter the toolset hash).

## 1.99.0

### Minor Changes

- 9e00888: Runtime floors for evidence and acceptance (RV507), all additive and opt in; defaults change nothing. `evidenceContract.enforce: 'refuse'` makes the declared floor binding at the child's terminal: an ok finish whose transcript carries fewer successful `record_evidence` executions (the tool's own `recorded: true`; duplicates and failed verifications never count) than `minEntries` becomes a typed `terminal` error whose journaled data carries the machine-readable `evidenceFloor: { recordedEntries, minEntries }`, memoized so a resume rolls the refusal forward instead of re-paying (the default `'warn'` keeps the historical preflight-only signal). `evidencePreservedValidator({ requireNonEmptyPool: true })` refuses the empty known citation pool with an `empty child citation pool` reason instead of the vacuous pass. `OrchestrateAcceptance.minSpawnedChildren: N` rejects a finish whose spawned roster is smaller than N under both child policies (zero spawned children stop being vacuously complete for a fan-out-shaped task), with the actual roster carried beside the floor in the journaled decision and the rejection's error data.

## 1.98.0

## 1.97.0

### Minor Changes

- 5c3b453: Per-request cost accounting and per-segment pricing pins (RV504/RV505/RV511, the ninth-experiment accounting P1s).

  RV504: when a terminal entry's per-dispatch `providerCalls` exactly cover its usage, `costReportFromJournal` and `invoiceFromJournal` now price each provider call individually, so a nonlinear long-context tier fires per REQUEST, which is the pricing contract's stated semantics. An aggregate that crossed a threshold no single request crossed no longer re-prices the whole entry: the ninth comparison experiment's settled report ran 52.4% above the live budget's per-dispatch debits for exactly this reason, and the two figures now converge. Entries without records, or with records that do not cover their usage, fold exactly as before (the per-model aggregate), and the invoice says so: `rowUsdNonAdditive` is now a computed boolean (false exactly when every contributing entry is fully attributed, so the per-call rows sum to the total; `allocatedUsd` remains the column that sums exactly in every case). The shared fold is public: `priceEntryBilling` with `EntryBillingUnit`/`EntryBillingFold` beside `priceEntryUsage`.

  RV505: `journalPricingSnapshot` now composes the run-settle pricing pins by their settle seq, with no journal shape change: a seq-aware fold prices each row under the pin of ITS OWN segment (the rates its live debits actually used), so a suspend/resume across a price-table rotation no longer re-prices settled history under the new table. Seq-less callers keep the historical last-pin behavior. `priceUsd` callbacks across the accounting folds accept an optional third `seq` argument (existing two-argument implementations are unaffected), the snapshot exposes `pinnedThroughSeq`, and the engine's settled-outcome cost mirror composes pinned history with the live table for the segment being settled.

  RV511: the CLI invoice text output now states the pricing basis honestly per export: additive per-request rows, or the aggregate basis with the reason (a remainder or legacy entry in the fold).

## 1.96.0

## 1.95.0

## 1.94.0

## 1.93.0

### Minor Changes

- c62150a: The mid-batch checkpoint boundary (RV408, the eighth-experiment review). Checkpoints write once per completed tool turn, so a kill inside one large parallel batch re-paid every executed call of that batch on resume; with the whole executed-call budget fitting into a single batch (the `tool-cap-before-checkpoint` preflight warning), the re-paid window was the entire budget. The opt-in `limits.checkpointEveryToolCalls: K` bounds it: after every K executed calls within a batch the loop durably writes the same pending state the ask-approval suspension already checkpoints (the executed prefix verbatim, the next call, the remaining tail), and the existing restore path reuses the prefix and re-runs at most the calls since the last boundary. Denied and refused calls never advance the cadence, the batch's last call writes no extra boundary, and isolated-executor idempotency keys are unchanged. Off by default and byte-identical when absent: no journal bytes and no model requests change, only the transcript checkpoint cadence. A cadence below the executed-call ceiling silences the `tool-cap-before-checkpoint` warning, whose message now names the mitigation.

## 1.92.0

### Minor Changes

- 351d1f5: Historically stable invoices via the applied-pricing pin (RV407, the eighth-experiment review). The invoice and cost folds price at fold time, so a live price-table update used to silently re-price history. When `createEngine({ pricing })` is configured, the settling segment now pins what it actually applied, the resolved pricing row of every model the journal used plus the table's `pricingVersion`, additively inside the existing run-settle decision value (the `outputHash` precedent: no journal shape change). The pin is gated on the configured table deliberately: caps-fallback pricing arrives ambiently from adapters and a setting the user never enabled must not change the journal, so table-less runs settle byte for byte as before; rates the fold would refuse anyway, non-finite or negative, are never pinned. New `journalPricingSnapshot(entries)` reads the pin back and rebuilds a `priceUsd` over exactly the pinned rows (absent models fold as unpriced, never a silent zero); `invoiceFromJournal` accepts a declared provenance and the export carries `pricing: { source: 'snapshot' | 'current-table', pricingVersion?, rows? }`. `rulvar invoice`, `rulvar inspect`, and the server's stored-run cost endpoint prefer the pin, so a repeated fold after the table changes reproduces the original numbers; journals settled before the pin keep the current-table fold and say so. Live pricing, budget admission, and journaled spend debits are untouched.

## 1.91.0

## 1.90.0

### Minor Changes

- 9603940: Scope the isolated-executor idempotency key to the run incarnation (RV403, the eighth-experiment review). A fresh run stamps the additive optional `RunMeta.execKeyDerivation` field (version 2) at genesis and every resume segment carries it verbatim; version 2 keys bind the run's generation token, so a `deleteRun`-then-recreate of the same explicit runId never reuses the deleted incarnation's keys against a long-lived external dedup store, while a crash-and-resume redispatch inside one incarnation keeps its key exactly as before. Runs recorded without the stamp derive the original genesis-free version 1 keys for their whole life, across resume and upgrade, so external dedup state accumulated for them stays valid; a recorded derivation the engine does not know, or a version 2 stamp whose store dropped the genesis token, is a typed resume refusal when executors are configured, never a silent fallback. The store conformance kit now checks the field's round trip alongside `genesis`.

## 1.89.0

### Minor Changes

- f18b671: Provider-id provenance parity across every adapter path (RV401, the eighth comparison experiment). The AI SDK bridge now ships the flat `responseId` the core reconciliation record reads, beside the nested `response` object it always emitted, and an error finish carries the accumulated response metadata and warnings on the error event instead of dropping them (retained parts stay deliberately absent there: a failed turn is discarded, never re-injected). The core agent loop captures provider metadata from error events and falls back to the AI SDK's nested `response.id` shape when a third-party adapter ships only that, with the flat first-class form winning when both are present. The OpenAI adapter attaches the failed response's id to its `response.failed` error event, so a billed failure reconciles against the provider statement exactly like an ok row. End-to-end tests pin a bridged engine run whose per-call reconciliation records carry ids on the success, retry, and billed-failure paths alike.
- f18b671: The synthesis reserve lifecycle decision now journals BEFORE the finish-validation termination throw (RV402, the eighth comparison experiment): a synthesis the validators terminally reject was still paid for out of the released reserve, and the run now keeps the frozen configured/held/released/remaining/consumed record on that failure path exactly as on success, idempotently across resume. Docs drift closed alongside: the FAQ now says the subprocess and container executors ship in `@rulvar/executor` instead of calling them a plan, the workflow guide no longer promises deadlines on approval suspensions (escalations only, per the durability table), the server guide scopes the approved tool's "exactly once" to its continuation segment under the documented at-least-once tool window, the RunMeta.argsHash doc points at `security.argsHashSalt` as the salted HMAC option, and the ctx dispatch comment names the full five-part idempotency key.

## 1.88.0

### Minor Changes

- 3b339d9: The evidence floor, the exact-fill parity proof, and the direct container e12 (PR III of the seventh-comparison-experiment plan: RV303, RV307, RV308, and the recommended tool budget posture).

  RV303, the declared evidence contract: `AgentProfile.evidenceContract` and `PreflightSpawnSpec.evidenceContract` (`{ minEntries, estCallsPerEntry?, overheadCalls? }`, the spawn declaration winning over the profile's, `researchAgentProfile` passing it through) declare how many evidence entries a spawn MUST record. Preflight compares the resulting call floor (`minEntries * estCallsPerEntry + overheadCalls`, defaults 3 and 8, exported as `DEFAULT_EVIDENCE_CALLS_PER_ENTRY` and `DEFAULT_EVIDENCE_OVERHEAD_CALLS`) against the spawn's effective executed-call ceiling (weighted units and extension grants included) and warns `tool-cap-below-evidence-floor` when the cap cannot fit the contract. Purely declarative, validated typed at both intake boundaries; the runtime never enforces it. The experiment relation nobody computed: 14 mandatory entries against a cap two workers exhausted at 10.

  RV307, the exact-fill parity proof (the judge's P1.8): a scenario suite pinning that the strict-at-fill admission projection and the live layer-2 gate deny THE SAME child for THE SAME reason on one set of numbers, at the exact-fill boundary specifically, while the below-fill retry admits in both layers, riding the existing slot-ledger guarantees (a rejection burns no `maxSpawns` slot; resume recounts journaled admits only).

  RV308, the direct container e12 (the judge's P1.9): the container executor now carries a DIRECT conformance test for the protocol-failure-at-clean-exit-0 case (typed `protocol` error, ledger outcome `error` with `exitCode: 0`), both against the daemonless docker stub (runs everywhere) and against the real daemon (docker-gated), instead of relying on source symmetry with the subprocess executor.

  Docs: the new "The recommended tool budget posture" section in the agents guide (default no cap: the USD ceiling plus exploration guards bound spend; a cap is a safety valve, never bare, always with notices, an extension, a reserve or window, and a deliberate salvage decision; the full findings table), cross-linked from the budgets guide findings enumeration.

## 1.87.0

### Minor Changes

- c4c02b1: The finalization window, the bare-cap linter, and the synthesis reserve lifecycle (PR II of the seventh-comparison-experiment plan: RV302, RV305, RV306, and the deferred half of RV304).

  RV302, `limits.finalizationWindow: { reserveCalls, allow? }`: once the remaining tool budget (executed calls against the effective `maxToolCalls`, or remaining weighted units against `toolUnits.max`, whichever is closer) drops to `reserveCalls`, only finalization tools may execute. A call outside the allowlist receives a typed refusal (`guard: 'finalization-window'`, visible to the model, never terminal, consuming no budget), and the model is told once, via a plain user message, to record its evidence and finish. The allowlist defaults to the tools priced at `toolUnits` cost 0; the engine terminal tool is always admitted, and `escalate` is structurally exempt. With `toolBudgetExtension` configured, remaining money converts into a grant BEFORE any window refusal, so the two features form one policy: spend the headroom first, then finalize. On resume the window re-arms from the restored counts without re-announcing; without the field every request, journal, and cassette stays byte identical. The `toolBudget` pressure snapshot gains `finalizationWindowEntered`, and the `tool:end` guard union is now honest about all three engine guards (`repeated-signature`, `per-tool-cap`, `finalization-window`).

  RV305, the bare-cap linter: preflight warns `bare-tool-cap` when a positive `maxToolCalls` or a `toolUnits` budget has no softener at all (no `toolBudgetNotices`, no `toolBudgetExtension`, no `finalizationReserve`, no `finalizationWindow`); a cap of 0 is a deliberate no-tools spawn and stays quiet. Orchestrate waves with a DECLARED acceptance additionally get the info `capped-children-without-salvage` when capped children meet a policy with both salvage arms off. The window itself gets three findings: `inert-finalization-window`, `finalization-window-covers-cap`, `finalization-window-empty-allowlist`, and `PreflightOrchestratorSpec` gains the declarable `acceptance` slice.

  RV304 second half (the judge's P1.7): a configured `budget.synthesisReserveUsd` now reports its whole lifecycle `{ configuredUsd, heldUsd, releasedUsd, remainingBeforeSynthesisUsd?, consumedUsd }`, frozen into a journaled decision (`orchestrator_synthesis_reserve`) when the synthesis invocation settles, emitted as a `log` info event, and attached to the acceptance result envelope as `synthesisReserve`. `heldUsd: 0` under a configured reserve makes the silently inert no-cap case visible; a resume reads the frozen decision instead of recomputing. Without a configured reserve nothing is journaled, emitted, or attached.

  RV306: the engine-level terminal-at-exhausted-budget scenario suite (the judge's P0.3): the terminal finish dispatches after the cap through a real engine run with the journal underneath, its validator rejection travels back, the repair lands, batch neighbors get the typed skip, and the non-terminal control still journals `limit`.

## 1.86.0

### Minor Changes

- 2f71894: The adaptive tool budget and the pressure snapshot (RV301/RV304, the seventh comparison experiment). `limits.toolBudgetExtension: { increment, maxExtensions, minHeadroomUsd?, requireNewEvidence? }` converts remaining budget headroom into more executed tool calls at a `maxToolCalls` expiry instead of settling `limit`: up to `maxExtensions` grants of `increment` calls, each admitted only with chain headroom remaining (the same arithmetic the per-turn output clamp prices, now exposed as `RunBudget.remainingUsd` and the `BudgetHooks.remainingUsd` seam), by default only with new evidence since the previous grant (the exploration guard's digest chain; a result the canonical serialization cannot digest fails the grant closed), announced to the model as a deterministic user message with the exact new counts, and re-derived conservatively from the restored executed-call count on resume, so nothing new is journaled or checkpointed. A terminal `finish` never spends a grant (it already rides the v1.79 budget exemption), `toolUnits` is never extended, and an invocation without the field stays byte identical. The experiment that motivated it starved two of four mandatory workers at a fixed 84-call cap while $3.85 of the $10 ceiling sat unspent.

  Preflight assumes the fully extended cap in every projection (executed-call ceilings, projected provider turns, quota windows, the checkpoint loss window) and adds two findings: `inert-tool-budget-extension` (warning; an extension with no `maxToolCalls` to extend) and `tool-budget-extension-exposure` (info; the declared worst case).

  Every invocation with `maxToolCalls`, `toolUnits`, or the extension configured now carries the `toolBudget` pressure snapshot — `{ used, cap?, unitsUsed?, unitsMax?, extensionsGranted?, noticesFired?, finalizationReserveUsed?, limiter? }` — on the full `AgentResult`, the live `agent:end` event, and the invocation table's agent rows, so a host sees cap pressure before a starved worker ever settles `limit`. Live telemetry only, exactly like `transportRetries`: never journaled, absent on a replayed result. The synthesis reserve lifecycle telemetry (the judge's P1.7) is deliberately deferred to the next cycle. Docs: the stores guide frontmatter now names PostgreSQL beside the other shipped stores, and the README states the exact never-pay-twice boundary (recorded as complete), matching the durability guide.

## 1.85.0

### Minor Changes

- 6932a9f: Three fail-closed fixes from the cycle 83 sweep, plus the dependency refresh.

  **Engine.** A typed error thrown out of `ProviderAdapter.stream()` now keeps its own class instead of being laundered into a retryable transport fault. A `ConfigError` (a bridged model id that does not match the wrapped model, an unsupported role, a namespaced option contradicting a canonical field) used to be retried through the whole backoff ladder and then trigger transport failover, so a misconfigured primary silently served the run from a fallback model the caller never asked for while the real fault vanished behind a generic message. Typed errors that ARE retryable by class (a lost lease) keep retrying exactly as before, and an untyped throw is still a retryable transport fault.

  **Planner sandbox.** The realm scrub replaced `Date.now` and `Math.random`, which left three ambient sources open: a bare `new Date()` never consults `Date.now` (V8 reads the system clock directly), `performance.now()` is a second live clock, and WebCrypto (`crypto.randomUUID()`, `crypto.getRandomValues()`) is raw entropy. Those are the first idioms a machine-written script reaches for, and each silently produced a run that could not reproduce on replay. All of them now draw from the same seeded stream: zero-argument `new Date()` and `Date()` take the logical clock, `performance.now()` is that clock minus the segment base, `crypto.randomUUID()` is the journaled uuid shim, and `crypto.getRandomValues()` fills from the seed. Passing a timestamp or a date string to `Date` stays a pure conversion.

  **Server.** A tracked run whose segment REJECTS instead of settling (the genesis ownership boot refusing a run another process owns, a withheld settlement whose durable write failed) was reported as `running` for the life of the process, its SSE connections never closed, and neither retention nor the settled cap could release it. `GET /runs/:id` now answers `status: "error"` with the typed wire error, connected streams close with a comment naming the failure, a late subscriber gets that comment instead of an empty stream, and the tracked run becomes eligible for retention like any other terminal run.

  **Dependencies.** `@anthropic-ai/sdk` moves to `^0.115.0` (the only shipped floor its caret was blocking); in-range minors refresh across the workspace. The four majors stay held: eslint 10 and `@eslint/js` 10, `@types/node` 26 against the Node 22.12 floor, and TypeScript 7. The tsdown resolution is pinned at 0.22.3 because it generates the frozen `.d.ts` artifacts, including the published `@rulvar/compat` tarball that must repack byte identical.

## 1.84.0

## 1.83.0

## 1.82.0

### Patch Changes

- 9cc5d66: The free-cleanup harvest (cycle 80). `leasableStoreConformance` gains the `expiry` option: the mandatory lease checks follow the suite's no-wall-clock convention, so the harness now hands them a store whose ttl no scheduler stall can cross, and only the wall-clock expiry check keeps a short-ttl store of its own; the legacy single-`ttlMs` pairing let one CI stall past 150 ms expire a just-acquired lease inside a fencing check (the flake observed on Node 22). All three shipped harnesses move to the split pairing, and the store-authors guide stops recommending the flaky shape. In `@rulvar/cli`, worker retention is no longer slot-bound: a worker whose every concurrency slot is busy still applies retention over settled runs during its sweeps instead of starving until idle. In `@rulvar/core`, concurrent cold `tools()` calls on an MCP source share one in-flight `tools/list` fetch instead of each sweeping the list, and `AdmissionController`'s `maxTotalSpawns` TSDoc now tells the truth: it is the controller-lifetime cap on admitted spawns for hosts driving the controller directly (pinned by a test), while engine runs cap totals through `budgetDefaults.lifetimeSpawnCap`; the old comment claimed it was the per-orchestrate `maxSpawns`.

## 1.81.2

### Patch Changes

- 296885b: Three defects from a deep review of the MCP bus and the queue worker (cycle 79). In `@rulvar/cli`, `createWorker().stop()` now waits out a sweep that is still scanning the store before taking its cancel snapshot, and a sweep observes the stop before every lease: previously a stop() racing an in-flight sweep could resolve while that sweep went on to lease and drive a new run, leaving a live run and a held lease behind a "stopped" worker. In `@rulvar/core`, the MCP tool source no longer loses a `listChanged` notification that races the in-flight `tools/list` fetch (the fetched list is served but never pinned as the session cache, so the next snapshot refetches), and cursor pagination treats an empty `nextCursor` as exhaustion instead of spinning the import loop forever on a server that echoes it. A regression test also pins the SDK-level rejection of a declared `outputSchema` with no `structuredContent`, guarding the planned SDK v2 migration.

## 1.81.1

### Patch Changes

- c030982: The side-effect ledger records the outcome a dispatch actually had: a tool whose stdout violates the result protocol (non-JSON output from a clean exit) now ledgers `error` instead of `ok`, in both the subprocess and container executors, and the executor conformance kit pins it as check e12. In `@rulvar/core`, `stripFencedBlocks` closes fences in CRLF text (a trailing carriage return no longer keeps a fence open and swallows the rest of the document), which `fencedCode: 'excluded'` validators and `headingStructureValidator` inherit. Docs drift closed alongside: the package count, tables, and dependency graphs catch up to `@rulvar/executor` and `@rulvar/store-postgres`, the durability page reflects the shipped data protection hooks instead of denying them, and the architecture page no longer claims only the in-process executor exists.

## 1.81.0

### Minor Changes

- ce4c392: The sixth comparison experiment's P2 harvest (cycle 77). `maxSpawns` now counts ADMITTED children instead of attempt ordinals: an admission-rejected spawn (budget, quota, depth) consumes no slot, so the orchestrator can retry a rejected mandated role at a viable budget instead of losing it to `orchestrate maxSpawns N reached` (the rematch's run 2 shape); recovery rebuilds the same ledger from journaled admits, and attempt volume stays bounded by the coordination turn's tool budget. New stock validator `headingStructureValidator({ sections, ordered, exclusive })`: the markdown headings of one level (derived from the shared marker) held to the declared set, in declaration order, each exactly once and none undeclared, fenced code always stripped first (the judge's P1.3: line presence proves existence, not structure). The near-JSON finish recovery is durable (the judge's P1.5): `AgentResult.schemaRecoveredTerminalExchanges` counts the terminal exchanges the unparsed second chance salvaged (a live process counter like `transportRetries`, absent when zero), and orchestrations fold both windows into `schemaRecoveredFinishExchanges` on the acceptance ok envelope and the typed failure data, beside the rejected twin.

## 1.80.0

### Minor Changes

- 262e397: The synthesis budget reserve and the strict admission projection (the sixth comparison experiment, cycle 76). The opt-in `budget.synthesisReserveUsd` holds absolute dollars out of the orchestrator sub-account while the coordination loop runs: spawn admission and the per-turn output clamp treat the hold as spent (the severing check does not, so a coordination running against the hold is clamped smaller, never aborted), and the hold is released to the synthesis invocation just before it dispatches. Without it the rematch's first run lost a full paid run: the default 0.2 sub-account funded the coordination prefix and the budget clamp shrank the synthesis turns below the contract's minimal accepting payload, so the finish was cut at its output allowance before any tool call and the validator-bound run failed closed at `maxTurns`. The reserve requires the `synthesis` option (single mode), must stay below the effective cap (`OrchestratorCapConfigError` otherwise), and nets out of the capped orchestrator's exact-fill admission hint exactly like the finalize carve-out. `preflightEstimate` prices the contract's minimal accepting payload at the synthesis model's output rate and reports the warning `synthesis-reserve-unfunded` when a contract binds the synthesis and the hold is missing or too small.

  The admission projection is now STRICT at exact fill for the children of an orchestrate wave: the coordination turn that issues the spawn tools is paid before any spawn executes, so a child whose reserve fits only at exact fill is certain to be rejected live, and the projection now says so (`partial-admission`) instead of promising the full wave. The rematch's second run lost its mandated fourth specialist to exactly that promise: the estimator projected 5 of 5 admitted while the live gate rejected the fourth spawn with reason `budget`. The orchestrator's own row keeps its exact-fill admission (it admits at run start, before any spend exists), and plain waves are unchanged. Absent the new option every budget account, journal, prompt, and cassette stays byte identical.

## 1.79.0

### Minor Changes

- 85956ab: Terminal admission at an exhausted tool budget, the two harness-shape preflight findings, and the degradation mirror (the fifth comparison experiment).

  The fifth experiment lost a complete 3984 word answer to terminal tool starvation: the harness set the synthesis tool cap to the child count, the mandatory `get_child_result` reads spent the whole budget, and the ready `finish` was cut BEFORE the terminal interception, so the validators never ran, the funded repair reserve never armed, and the run failed closed with the candidate stranded in the transcript.

  - The terminal tool is now exempt from the tool budget in both directions: it never consumed `maxToolCalls` or `toolUnits` below the cap, and an exhausted budget no longer starves it either. An admitted finish validates and, on rejection, feeds the repair grants exactly as below the cap; non-terminal calls beside it are answered with typed skipped results so the continued exchange keeps a well formed history; a batch with only non-terminal calls past the cap settles `limit` byte identically to before.
  - New preflight warning `synthesis-terminal-tool-headroom`: `synthesis.exposeChildResultTools` with a `synthesis.limits.maxToolCalls` below one read per possible child (`orchestrator.maxSpawns`) loses evidence access to the reads themselves.
  - New preflight warning `draft-gate-below-contract`: a `draftPolicy.minWords` below the contract's own word minimum admits drafts the final validators must reject, so the paid synthesis starts from an underlength base. The preflight input mirrors `finishValidation.draftPolicy` for it.
  - The completion lift now mirrors the degradation facts the acceptance envelope already emits: `degradedReasons`, `salvagedPartialChildren`, and `salvagedTerminalOutputChildren` ride `run:end` and the `RunOutcome` under the same shape validation as `completion` and `childStatusCounts`, and the OTel exporter maps them to `rulvar.run.*` attributes. An empty array is the workflow's claim of zero degradation; absence means no claim.

## 1.78.0

### Minor Changes

- 941b6e1: Contract exactness (the v1.74 experiment review, cycle 74, the last fourth-report slice). The `finishContract` bundle is now DEEPLY frozen: the nested manifest objects, the sections array, the validators array, and each validator object, so a post-construction mutation throws a `TypeError` instead of silently diverging enforcement from the journaled contract hash (on 1.77.0, pushing into `manifest.sections` changed the live validator through a shared array reference while `hash` kept claiming the original manifest). The contract now carries one reject golden PER validator (`goldenRejects`), each proven at construction, and both the orchestrate construction self test and `preflightEstimate` hold the CONFIGURED validator of each name against its golden: a same-name replacement weaker than the contract's own validator (a words minimum of one standing in for fifty, which on 1.77.0 passed the single shared reject fixture on the strength of an unrelated validator and let an end-to-end run accept a five-word result against a `words.min: 50` contract) is now a `ConfigError` at construction and the new error finding `output-contract-validator-weakened` in preflight; `selfTestFinishValidation` accepts the goldens via the new `rejects` option. Two manifest knobs sharpen matching: `sectionsMatch: 'line'` demands each section marker as its own line (a mid-sentence mention or a marker echoed inside a code fence no longer satisfies a heading), and `fencedCode: 'excluded'` removes fenced code blocks (the exported `stripFencedBlocks` grammar) before section matching, per-section slicing, word counting, and citation matching, so code samples can neither pad `words.min` nor donate citations, and a fenced marker occurrence can no longer mis-anchor a section's citation slice. Both knobs default to the historical behavior, normalize away at their defaults, join the hash and the prompt statement only when non-default, and exist on the standalone validators too (`match` on `requiredSectionsValidator` and `sectionCitationsValidator`, `fencedCode` on those plus `wordCountValidator` and `minMatchesValidator`). Absent knobs and untouched bundles keep every existing configuration byte-identical: prompts, hashes, journals, and validator verdicts.

## 1.77.0

### Minor Changes

- 6aba271: The v1.74 experiment review, cycle 73: contract turn feasibility in preflight, contract generation scoping, and error-outcome parity.

  Preflight now proves a conforming answer can physically fit one finish turn of the invocation the validators bind: the contract's minimal accepting payload priced at the loop's four characters per token heuristic against the effective output bound is the error finding `output-contract-turn-infeasible` when it cannot fit and the warning `output-contract-turn-headroom` when the margin is under double; validators with repairs possible but no `repairTurnReserve` draw the warning `repair-reserve-unfunded`, and the preflight `finishValidation` input mirrors `maxRepairs`.

  The fix-and-resume remedy is generation scoped: finish-validation decisions written under a contract carry `contractHash`, `repairsUsed` counts only the current generation, and a final rejection a superseded generation left in the crash window neither rolls forward at boot nor re-arms on replay (the stale exchange replays byte identical and the loop continues into a live repair turn). Pre 1.77 decisions carry no hash and bind to the current contract only while the journal holds a single bundle descriptor.

  Typed finish failures now mirror the full acceptance snapshot (`degradedReasons` and the salvage lists beside `completion` and `childStatusCounts`) and count the invisible exchange class: `AgentResult.schemaRejectedTerminalExchanges` reports the terminal exchanges that died at the schema gate (window derived, absent when zero), and orchestrate folds the coordination and synthesis windows into `schemaRejectedFinishExchanges` on the failure data. Absent options and contractless configurations keep byte-identical journals, prompts, and cassettes.

## 1.76.0

### Minor Changes

- 22cba47: Synthesis evidence symmetry and the coordination draft gate (the v1.74 comparison review, P0.2 + P0.3). The finish validators judge the synthesis result against the FULL child outputs while the synthesis model saw only the draft and 400 char digest rows on a finish-only toolset; when the v1.74 experiment's draft collapsed to 'test', preserving the demanded 66 citations was model-impossible and the run ended answerless. Three opt-ins, each byte identical when unset: `synthesis.exposeChildResultTools` gives the synthesis invocation the RV-201 read tools `get_child_result` and `read_child_artifact` (the digest rows then carry each child's `handle`); `synthesis.context: 'full'` embeds a `CHILD OUTPUTS` section with every settled child's full serialized output beside the digests; `finishValidation.draftPolicy` (`minWords`, `requireSections`) rejects a schema-valid but collapsed coordination draft as the call's error result BEFORE any paid synthesis dispatch, with deterministic library checks that journal nothing and the same `repairTurnReserve` headroom the synthesis finish gets. `preflightEstimate` reports the asymmetric shape as the new warning finding `synthesis-evidence-asymmetry`, and the preflight synthesis input mirrors the two new fields.

## 1.75.1

### Patch Changes

- 82bc0f0: The unparsed-arguments second chance now covers the terminal tool (the v1.74 experiment review, P1.5 completion). The terminal tool validates its arguments at its own interception site, so 1.75.0 recovered regular tools only while the experiment's actual casualty was the coordination finish. Both sites now share one validation path: a near-JSON finish payload recovers deterministically and ends the loop in one turn with the recovered result; truncations and imitated wrappers keep the exact old error result.

## 1.75.0

### Minor Changes

- c486de8: The provider output floor and the finish arguments second chance (the v1.74 comparison review, P0.1 + P1.5). `ModelCaps.minOutputTokensPerTurn` declares the smallest request output cap the provider accepts (OpenAI Responses: 16; absent means one), and the layer-2b budget clamp never dispatches below it: the last-gasp turn goes out AT the floor instead of one token, a remainder that cannot buy the floor is refused as a typed `BudgetExhaustedError` with zero wire calls, and a configured per-turn cap below the floor is a `ConfigError`; `preflightEstimate` reports that configuration as the error finding `output-cap-below-provider-minimum`. Tool arguments an adapter delivered as the parse-failure wrapper `{__unparsed: raw}` now get one deterministic second chance before the schema rejection: a strict re-parse, then one bounded normalization (markdown fence, first balanced object, raw control characters escaped inside string literals); a recovered object that passes the tool schema executes as if it had parsed on the wire, with a warn log naming the pass, and replay or resume recovers identically with nothing journaled. The OpenAI wire re-projects an unparseable call as the ORIGINAL raw arguments string instead of the wrapper JSON, so a model no longer learns to imitate `{"__unparsed": ...}` from its own rewritten history. Both wires drop unsafe-integer `x-ratelimit` values instead of normalizing 400 digits into `Infinity`. `FakeAdapter` gains `capsOverrides` so offline tests can drive caps-declared behavior like the floor.

## 1.74.0

### Minor Changes

- d94beab: Quota drift telemetry and the honest zero (the v1.71 experiment review, P0.5 resized + P1.4). The experiment declared 12M TPM over a provider-real 1M, the local limiter went quiet, and seven live 429s followed with nothing recording the mismatch. Now: both wire adapters parse the provider's x-ratelimit headers on every real 429 into normalized per-minute limits (`WireError.data.reportedLimits`; the openai wire also gains the raw bucket capture the anthropic wire already had), the loop remembers them per (provider, model) as live telemetry, and the opt-in `quota.declaredRules` (the SAME rule array preflight takes) makes the engine journal a `quota_drift` decision plus a warn log whenever a binding declared cap EXCEEDS the provider-reported one, per invocation and dimension, with anthropic's split input and output windows summed against a combined declared tokensPerMinute. Purely observational, synthetic limiter denials never count, and without declaredRules journals and events stay byte identical. On the invoice, an `unconfirmed` row that recorded zero usage on every counter now carries `usageUnknown: true` (export-level `usageUnknownRows` count, CLI `usage-unknown` marker): the zeros mean "nothing recorded", never "the provider metered nothing"; derived at export time, no journal shape change.

## 1.73.0

### Minor Changes

- 3e95bd1: The synthesis repair envelope (the v1.71 experiment review, P0.4/P0.8/P1.7): `finishValidation.repairTurnReserve` grants bounded EXTRA turns to the invocation the validators bind, one per rejected finish exchange (schema-invalid finish arguments and host validation rejections alike), derived from the message window itself so resumes recount identically and nothing new journals; the deliberately-deferred RV-204 reserve, now that the experiment showed one malformed finish plus one validator rejection killing a whole run inside maxTurns 3. Every typed synthesis failure now carries the acceptance snapshot (`completion`, `childStatusCounts`, lifted onto the error outcome by the completion mirror, so an errored run still reports "the fan-out work is complete") and the verdict-derived repair taxonomy (`repairsUsed`, `maxRepairs`, `rejectedValidators`) read from journaled decisions. `preflightEstimate` models the separate synthesis invocation (`orchestrator.synthesis`: limits, model, estInputTokens; echoed at `budget.orchestrator.synthesis`, priced into `exposure.runCeiling`, the gap the experiment's projection stopped short of) and folds a declared `finishValidation.repairTurnReserve` into the projected turns of the bound invocation; the CLI prints the synthesis projection line. Zero reserve and no synthesis declaration keep every ceiling, journal, and report byte identical.

## 1.72.0

### Minor Changes

- 662e9e0: The unified output contract (the v1.71 experiment review, P0.1/P0.2/P0.3/P1.1): `finishContract(manifest)` generates the prompt statement, the stock validator set, a stable sha256 hash, and golden self-test fixtures from ONE immutable manifest, so the prompt a model follows and the validators a host enforces cannot drift apart by construction. `finishValidation.contract` wires it into orchestrate: the construction-time golden self test fails a stale validator as a ConfigError BEFORE any provider call (the experiment burned a full paid run on three renamed section headings), the contract statement is injected into the coordination and synthesis prompts, every contract validator must be present in the configured set by name, and the run journals a frozen bundle descriptor (`orchestrator_finish_validation_bundle`) with supersession on resume under a fixed contract. `preflightEstimate` accepts the same declaration and reports drift as the error finding `output-contract-validator-mismatch` with a `finishValidation` echo block. Two new stock validators: `wordCountValidator` (formal length bounds as code) and `sectionCitationsValidator` (per-section citation coverage, because a total count hides sections with zero provenance). Absent contract and selfTest, every existing configuration keeps byte-identical prompts, journals, and reports.

## 1.71.0

### Minor Changes

- 20d02e0: The preflight quota planner follows the run past the first wave (the second experiment report, rec 9). Every declared spawn now reports `projectedProviderTurns`, the provider-call ceiling of its whole loop (`maxTurns` bounded by the executed-call ceiling plus the final no-tool turn, plus the finalization summary turn when a tool budget limiter arms it), and the orchestrator echoes its own. `exposure.runCeiling` totals the declared wave run to those ceilings at the declared estimates: provider calls as fan-out times per-spawn turns, and cumulative tokens with the context regrowing every turn (turn k re-sends the declared prompt plus the k-1 prior output bounds, so a K-turn loop costs K x est + outputBound x K(K+1)/2). Three findings compare that projection against the declared `quotaRules` when the first-wave checks stay silent: `quota-requests-below-run` (the loops project more wire requests than `requestsPerMinute` admits; the message names about how many windows the run needs at best), `quota-tokens-below-run` (the regrowth cumulative exceeds `tokensPerMinute`), and the spawn-attributed `quota-turn-never-fits` (by turn k the single context-grown reservation exceeds the whole token window, which the limiter denies with `retryAfterMs 0` and no wait helps). The first-wave checks are byte-identical, and a run whose ceiling fits its windows produces exactly the findings it did before. `rulvar preflight` prints the new turn ceiling per spawn and the run ceiling on the exposure line; `--json` carries the fields verbatim. The experiment run behind the recommendation had zero preflight quota findings and eleven live limiter denials; this projection is what would have said so before the first dispatch.

## 1.70.1

## 1.70.0

## 1.69.0

### Minor Changes

- b21a681: The tool-cap-before-checkpoint preflight warning (the experiment review, recommendation P1.8). The runtime checkpoints once per COMPLETED tool turn, and nothing in the limits vocabulary bounds a parallel batch below the executed-call ceiling, so a worker on a parallel-tools model can consume its whole tool budget inside the first batch, before any checkpoint exists: a kill mid-batch re-pays every executed call on resume. `preflightEstimate` now emits the stable warning `tool-cap-before-checkpoint` for every declared spawn whose effective executed-call ceiling is finite and positive while the resolved model's caps report parallel tool support, with the exact ceiling named in the message. Serial models (one call per turn, a one-call loss window), uncapped spawns, and zero caps stay silent, and reports over such shapes are byte-identical to before.

## 1.68.0

### Minor Changes

- b227874: The machine-readable synthesis-skip reason (the experiment review, item 11.4, recommendation P1.5). A run that configures the post-fan-in `synthesis` invocation and never runs it used to show zero `synthesize` spend with no recorded cause: the artifacts of a rejected run with synthesis configured were byte-indistinguishable from a run that never configured synthesis at all, and a host had to infer the skip from the acceptance decision and the RV-211 design. Both designed skips now record the exported `OrchestrateSynthesisSkipReason`: the journaled decision that causes the skip freezes `synthesisSkipped` (`'synthesis_skipped_by_acceptance'` on the rejected acceptance decision, `'synthesis_skipped_by_budget_cap'` on the budget-cap decision, immune to live-option drift on resume), the typed `FailRunError` data of the failing paths carries the same field, and an info `log` event (`orchestrator synthesis skipped`) announces it beside the zero spend, on the live pass and on every resume roll-forward alike. The field is absent when synthesis is not configured or when it actually ran, so existing runs stay byte identical.

## 1.67.0

### Minor Changes

- 8e6006d: The honest invoice (the experiment review, items 11.2/11.3, recommendations P1.2/P1.3/P1.4). The reconciliation verdict now names exactly what it asserts: the value `matched` is renamed to `provider-id-present`, because the library never sees provider billing data and the old term read as a statement match it cannot make (deeper reconciliation tiers are host-side joins keyed on `responseId`). Consumers comparing `row.reconciliation === 'matched'` must switch to `'provider-id-present'`; `reconciliationFailures` keeps its meaning (rows without a provider id). `InvoiceExport` is now self-describing about pricing: `pricingBasis: 'per-call'` declares that per-row `usd` prices each call individually at current rates, and `rowUsdNonAdditive: true` warns that those values need not sum to `totalUsd` under a nonlinear price table (long-context tiers price a split differently from its sum). For consumers whose rows must sum, every `InvoiceRow` gains the additive `allocatedUsd` column: each (entry, serving model) slice of the same gross fold the totals run is distributed across its rows in proportion to per-row `usd` (token weights when every row priced to zero), one row absorbs the IEEE rounding dust, and the flat sum over `rows` reproduces `totalUsd` exactly. `rulvar invoice` prints the declared basis in the text form and passes the new fields through `--json` unchanged.

## 1.66.0

### Minor Changes

- 1b8987e: The RunOutcome completion mirror (the 1.65.0 experiment review, P0.5). The semantic completion lift (`completion`, `childStatusCounts`) rode ONLY the `run:end` telemetry event, so a host consuming `handle.result` had to parse the workflow-shaped value on the accepted path and dig the typed error data on the rejected one. The engine now computes the lift once and spreads the same object onto both surfaces: `RunOutcome.completion` and `RunOutcome.childStatusCounts` are present exactly when `run:end` carries them (an ok/exhausted run whose result value makes a valid completion claim, or an error run whose typed error data does, the orchestrator acceptance path emits both), absent otherwise, so the outcome and the event can never disagree and a replayed resume mirrors the identical fields.

## 1.65.0

### Minor Changes

- 0b6b859: Terminal-output salvage for limit children (the 1.64.0 experiment review, P0.4 + P1.1). A child that hits its tool budget with `limits.finalizationReserve` configured can end `limit` CARRYING a terminal output that already validated against its declared output schema; published bits discarded that paid, journaled work at every orchestrator surface. Now the digest appends `final: {...}` and `get_child_result` pages the full output unconditionally, and the new opt-in `acceptance.acceptValidatedTerminalOutputOnLimit` lets the completion policy count such a child as a success: the accepted envelope reports `completion: 'partial'` and lists the children in `salvagedTerminalOutputChildren`, an invalid summary keeps `output: null` and still rejects (validation runs before acceptance by construction), and a child carrying both an output and a progress partial salvages by its output. The finish validation input gains `FinishValidationChild.salvageableOutput` (set only under the option), and `evidencePreservedValidator` counts a marked child's citations in the cited pool, so `requireKnown` no longer flags the orchestrator for quoting salvaged evidence. Every configuration without the option keeps byte-identical prompts and acceptance folds.

## 1.64.0

### Minor Changes

- 991f9b5: Preflight and live admission share one reserve arithmetic (the 1.63.0 experiment review, P0.3).

  Published 1.63.0 drifted from the runtime in both directions for orchestrate waves. A capped orchestrator below the flat reserve made `preflightEstimate` emit the error-tier `orchestrator-cap-below-reserve` finding (exit 1 in CI) while the live run started fine, because the live dispatch admits the capped orchestrator at EXACT FILL with the `effectiveCap - committedFinalizeReserve` estimate hint. And the projection admitted children whose priced layer-1 arm was tiny while the live embedded layer-2 spawn gate, which never sees the priced estimate, rejected every one of them against the remainder net of the orchestrator's own hold.

  Now the two formulas are exported pure functions the live paths themselves call, and `preflightEstimate` calls the same two: `dispatchProjectionReserveUsd` (the layer-2 spawn-gate projection: the declared estimate or the flat default, clamped by the spawn's explicit budget) and `orchestratorAdmissionEstCostUsd` (the capped orchestrator's exact-fill dispatch hint). An orchestrate wave now mirrors the runtime's two gates per spawn in live order; a plain wave keeps the parity-proven `admitSpawn` mirror. New inputs: `PreflightSpawnSpec.budgetUsd` (the spawn param; layer-2 clamp only) and `PreflightOrchestratorSpec.estInputTokens` (the uncapped orchestrator's goal-prompt stand-in). Removed: the false `orchestrator-cap-below-reserve` error finding and the `'orchestrator-cap'` deniedBy value (a tight cap is a tight loop budget, never a refused run). Three new parity tests run live orchestrations beside the projection: the capped-below-flat config, the all-children-denied wave, and the layer-2-pass-layer-1-bust spawn.

## 1.63.0

### Minor Changes

- 8a28aed: Durable settlement acknowledgement and the fencing-epoch tombstone (the 1.62.0 experiment review, P0.1 and P0.2).

  Settlement acknowledgement: a NON-fencing failure of either settlement write now rejects `handle.result` with the new typed `SettlementError` (code `settlement`, retryable; `stage` names the write, `data` carries the runId and the computed run status) instead of resolving as if nothing happened. Only a superseded segment's `LeaseHeldError` stays swallowed, on both writes, because the successor owns settlement. A failed `run_settle` append also skips the terminal meta write, so the projection can never run ahead of the journal (published 1.62.0 wrote meta `ok` over a journal with no settle record when the append failed). Recovery is deterministic and free: the run's work entries are already durable, `engine.resume` replays to the same outcome without one paid provider call and re-attempts the settlement writes (a non-empty journal with no recorded settle now re-settles on pure replay), and `rulvar runs audit [--repair]` reconciles offline.

  Fencing-epoch tombstone: `SqliteStore` and `PostgresStore` no longer erase the per-run epoch high-water mark on `delete`, so a recreate of the same explicit runId always acquires a strictly higher epoch and a zombie lease from the deleted incarnation (same runId, same stable owner identity) is rejected on every fenced surface instead of fencing green. The `LeasableStore` contract now states the rule, and the conformance kit enforces it with two new mandatory checks (`fencing-epoch-tombstone` in `leasableStoreConformance`, `fenced-tombstone-zombie-rejected` in `fencedWritesConformance`). The tombstone holds only the runId and a counter, never run content; the data-protection guide documents the erasure boundary.

## 1.62.0

### Minor Changes

- fca5fd1: Ship the preflight effective-limits estimator and effective-config linter (the experiment-review P2.2): everything the engine derives from a configuration, computed before any provider dispatch, machine readable, with zero paid requests by construction.

  Core exports `preflightEstimate(input)`: a pure function over the same options `createEngine` and `engine.run` receive plus a declared spawn wave, returning the JSON-serializable `PreflightReport`. The estimate cannot drift from the engine because it reuses the runtime's own arithmetic: `mergeUsageLimits` for the effective per-spawn limit merge (call over profile over engine defaults), `admissionReserveUsd` for the layer-1 reserve formula arm for arm (estCost, profile estCost, the priced estimate from `estInputTokens`, the flat default, and the unpriced-model zero), the settlement price resolution, and the shared-quota dimension match. The report carries the admission projection over the declared wave mirroring `admitSpawn` exactly (which spawns admit, which are denied and by what: budget, spawn cap, orchestrator maxSpawns, or an orchestrator cap its own reserve cannot fit), the per-tool and weighted-unit executed-call ceilings with the first bottleneck named, the orchestrator effective cap and finalize reserve echo, the concurrency and per-provider exposure floors with the one-more-turn overshoot floor, and the linter findings with stable kebab-case codes (errors: `unrouted-role`, `unknown-profile`, `nothing-admitted`, `orchestrator-cap-below-reserve`; warnings: `partial-admission`, `weighted-units-bind-first`, `tool-unaffordable`, `unpriced-under-ceiling`, `inert-finalization-reserve`, `inert-tool-budget-notices`, `orchestrator-cap-fraction-bound`, the quota-window comparisons; infos: `overshoot-exposure`, `no-usd-ceiling`, `no-quota`, `per-tool-cap-unreachable`).

  The CLI gains `rulvar preflight <file|name> [--budget-usd N] [--profile NAME] [--spawns JSON] [--json]`: it assembles exactly the options `rulvar run` would (config, module exports, run profile) but constructs no engine, opens no store, and dispatches nothing. The declared wave comes from the new `preflight` export of the config or workflow module (`{ spawns?, orchestrator?, quotaRules? }`), `--spawns` overrides it, `--json` emits the machine-readable report, and the exit code is the linter contract: 1 when any finding has severity error.

## 1.61.0

### Minor Changes

- b4c1f1f: Durable provider reconciliation (the experiment-review P1.3): every live provider dispatch now mints a `ProviderCallRecord` on the terminal entry's `providerCalls` ledger, the CostReport splits gross from net, and `invoiceFromJournal` plus `rulvar invoice` export the rows.

  - **The per-dispatch ledger.** Every wire call the engine actually makes, successful or not, records `{ ordinal, role, servedBy, attempt, outcome, responseId?, usage, usageApprox?, errorCode?, aborted? }`, minted at the single dispatch chokepoint from the same sanitized usage the phase slices accumulate. Failed and retried attempts keep their billed usage attributable instead of dissolving into the aggregate; quota denials and abort short circuits that never reached the adapter mint nothing. The provider `responseId` both shipped adapters already surface on every finish is now persisted. The ledger rides every checkpoint boundary (kill-and-resume keeps pre-kill calls attributable, ordinals continuing) and restores verbatim on replay with zero live calls.
  - **Gross versus net.** `CostReport.totalUsd` stays the net ledger it always was (abandoned subtrees contribute zero). New required fields make the provider's view first class: `grossUsd` (net plus abandoned, the figure an invoice reconciles against; abandoning a branch never shrinks it) and `abandoned: { usd, unpriced, usageApprox? }`. `rulvar inspect` prints the gross line whenever a run abandoned paid work.
  - **The invoice export.** `invoiceFromJournal(entries, priceUsd)` returns one row per billable call with a reconciliation verdict per row: `matched` (response id present), `missing-provider-id` (a finished call without one), `unconfirmed` (a failed or severed call without one), `unattributed` (pre-ledger entries and restored remainders; the spend surfaces instead of vanishing). Totals are the same slice fold the CostReport runs, so `totalUsd === CostReport.grossUsd` exactly. `rulvar invoice <runId> [--json]` is the CLI form.

  The frozen cassette catalog is re-recorded for the additive `providerCalls` field on terminal agent entries (journal-shape-revision, policy not identity: no hashVersion change, no matching impact).

## 1.60.0

### Minor Changes

- 59bbeaa: The finalization reserve (the experiment-review P1.1): `limits.finalizationReserve` guarantees the model one bounded summary turn when a tool budget expires, so a research agent that pays for its evidence no longer dies mid-batch without its final report.

  Before this, a `maxToolCalls` or `toolUnits` expiry inside a tool batch dropped the batch tail silently (dangling tool calls without results in the transcript), settled `limit` before any further model turn, and named no limiter on the terminal. With the reserve configured (an object; `{}` enables it):

  - The batch tail closes explicitly: every call the budget did not admit gets a typed error tool result `{ error: 'skipped: the tool budget is exhausted; the call was not executed', limiter, skipped: true }`, keeping the transcript well formed and the skipped calls visible to the model and to transcript readers.
  - The model always gets ONE summary turn on the loop chain (failover, retry policy, quota, and the budget all apply; usage is attributed to the loop role) with tools withheld and a request-only instruction naming the limiter, its counts, and the skipped calls. `finalizationReserve.maxOutputTokens` bounds this turn alone.
  - The `limit` terminal names the exact limiter: `error: { kind: 'terminal' }` with an errorMessage such as `tool budget exhausted: maxToolCalls (72/72); skipped tool calls: 3`.
  - The summary becomes the limit result's `output` (typed when a ridden schema parses it; one attempt, no re-prompt), the terminal journals the value, and a replayed result restores the same output with zero live calls. The structured terminal partial from `report_progress` still derives beside it.

  The reserve fires only for the two tool-budget limiters, never for `maxTurns`, `timeoutMs`, or the exploration aborts. A transport failure on the summary turn keeps the earned `limit` terminal with a `log` warning; host cancellation and the budget ceiling keep their own semantics. Without the field every byte stays as before, exactly like the other opt-in limits.

## 1.59.4

### Patch Changes

- c49d7a1: The genesis ownership protocol (P0.2): over a leasable journal store, every execution segment now holds the run's lease while it drives. A fresh `engine.run` and an in-process `engine.resume` that were not handed a lease acquire their own before their first durable write, renew it at a third of the store TTL exactly like a queue worker, and release it at settle; a second driver (a worker sweep adopting a live fresh run, a double resume from another process, a simultaneous genesis of one explicit runId) rejects at its own boot with the typed `LeaseHeldError`, before any journal write, meta write, or provider dispatch. Previously a fresh run held no lease at all, so a worker sweep on the same store adopted the live run, redispatched its in-flight provider turn (double spend), raced the journal from a stale tail, and could overwrite the settled meta with a stale error status. `RunOptions.lease` now exists as the genesis twin of `ResumeOptions.lease` for hosts that acquire at admission time and keep the lifecycle; `createEngine({ ownership: 'none' })` opts an engine out of automatic acquisition; dry-run previews never acquire. Journals stay byte-identical: leases live beside the journal and never enter run identity. The serialization wrapper now also forwards the store's `leaseTtlMs`, so the renew cadence over an encrypted store follows the configured expiry.

## 1.59.3

### Patch Changes

- deaef36: Bind the isolated-executor idempotency key to the logical invocation, not just the arguments (v1.59.x review P0.4). The key was `sha256(runId, tool, args)`, so two intentionally separate out-of-process tool calls in one run with byte-identical arguments received the same key, and an external system deduplicating on it would silently drop the second intended effect. The key now folds in the containing agent entry's journal seq and the call's ordinal within that agent's tool loop; both are journal- and checkpoint-stable, so distinct calls (different ordinals, or different agents) never collide, while an at-least-once crash-resume of the same logical call reuses the same agent entry and the restored ordinal and therefore the same key. `deriveExecIdempotencyKey` and the internal `ToolRuntime.executeExternal` gain the invocation parameters; the key never enters run identity (no content key or toolset hash), so journals stay byte-identical.

## 1.59.2

### Patch Changes

- dd0e10f: Bind envelope-encrypted journal ciphertext to the full entry identity (RV-217 follow-up from the external experiment review). The v1 associated data covered only `seq` and `key`, so a ciphertext could be transplanted between two runs of the same tenant wherever `(seq, key)` matched, and a stored entry's clear identity fields (`status`, `scope`, `ordinal`, `kind`) could be rewritten on disk without failing authentication. The new v2 envelope schema authenticates over the `runId` plus every immutable clear field (`hashVersion`, `seq`, `ref`, `scope`, `key`, `ordinal`, `kind`, `status`); a transplant into another run or entry, or a rewritten clear field, now fails typed instead of decrypting. The journal serialization hook gains an optional `JournalSerializationContext` carrying the `runId` (the wrapping store always supplies it; a host hook written against the original single-argument shape stays valid). Writes always emit v2; pre-upgrade v1 envelopes still decrypt on read, so an encrypting store upgrades in place with no migration step. Transcript blobs were already ref-bound (the ref embeds the runId) and are unchanged.

## 1.59.1

### Patch Changes

- c127770: Two fixes from the v1.59.0 external experiment review. `CostReport.byRole.synthesize` folded to `NaN` in the journal cost report and in settled run outcomes because the role-bucket initializer predated the `synthesize` role; the initializer is now an uncast exhaustive literal, so a future role that misses it is a compile error instead of a NaN bucket. The engine's own retry jitter defaulted to the live `Math.random`, which the bare-nondeterminism detector classified as workflow provenance when rulvar is imported from a checkout build rather than `node_modules`; the default retry rng is now bound at module load, the same convention as the engine clock, so engine-internal retries never emit `RULVAR_BARE_MATH_RANDOM` or fail a run under `determinism.mode: 'error'`.

## 1.59.0

### Minor Changes

- 615dc90: RV-216: the isolated tool executor, the last open item in the improvement plan. In-process tools are ordinary function calls with full host capabilities (an execution convenience, never a sandbox for hostile or model-generated code); this release adds an official out-of-process executor contract so a tool whose input is untrusted cannot reach host capabilities. (1) THE SEAM in `@rulvar/core`: a `ToolExecutorProvider` SPI, registered on the engine as `createEngine({ executors: { subprocess, container } })`. A tool declaring `executor: 'subprocess'` or `'container'` (previously a hard "only inprocess in v1" rejection) dispatches through the matching provider instead of running its `execute` closure; an unregistered tag is a typed ConfigError at spawn time, before any provider or model call. The dispatch mints the tool span exactly like an inprocess call and derives a stable idempotency key (a pure function of runId, tool name, and canonical args) so a side-effecting tool can fold an at-least-once retry into effectively-once; the tag never enters `toolsetHash`, so opting a tool into isolation does not change run identity, and inprocess dispatch stays byte-identical. (2) THE REFERENCE ADAPTERS in the new `@rulvar/executor` package: `subprocessExecutor` runs the tool in a child process with a REPLACED environment (host credentials scrubbed; the usual exfiltration path removed), a fresh ephemeral working directory per call, per-call short-lived credentials, a hard timeout that escalates SIGTERM to SIGKILL, and a bounded output capture, plus a `sandbox` launcher hook where bwrap/firejail/sandbox-exec plug in for filesystem and network isolation; `containerExecutor` runs it in a one-shot container with the network dropped (`--network none`), the root filesystem read-only, memory/CPU/pid caps, and all Linux capabilities dropped, which is where the strong isolation the subprocess adapter cannot promise on its own actually holds (a microVM adapter implements the same seam). `subprocessTool` defines a tool that dispatches through them; a `ToolEffectLedger` records every dispatch (idempotency key, tool, argsHash, workdir, outcome) so a host can bind an approval to the effect it authorized. (3) THE CONFORMANCE KIT: `executorConformance` is the executable shared-contract battery any command-based executor must pass, foremost the gate the epic exists for, a hostile tool cannot read the host's ambient credentials; the subprocess reference passes all of it, and the container reference additionally proves the network and filesystem isolation against a real runtime. New guide page: https://docs.rulvar.com/guide/isolated-executor.

## 1.58.0

### Minor Changes

- 4fa35ce: RV-217: data protection hooks, the full close. The plan's gate ("PII never persists or emits in plaintext under policy") now holds end to end. (1) ENVELOPE ENCRYPTION on the serialization seam: `createEnvelopeEncryption({provider, historicalWrappedKeys?, plaintextReads?})` returns a `SerializationHook` that AES-256-GCM encrypts every persisted byte (journal payloads, transcript blobs, checkpoints) with entry identity as associated data (a ciphertext moved between entries or refs fails authentication), keeping only the kernel-pinned ordering/identity fields plus spanId and timestamps plaintext; `DataKeyProvider` is the KMS seam (the exact shape of GenerateDataKey/Decrypt, called only in the async factory so the sync hooks run on in-memory data keys, and every envelope carries its wrapped key so reads need no live KMS); the shipped `localKeyProvider` derives KEKs via HKDF-SHA256 with an `info` partition for tenant-scoped keys (a different tenant's provider cannot unwrap, pinned by tests); reads of non-enveloped data fail closed by default with `plaintextReads: 'passthrough'` as the explicit migration mode; `fromStored(toStored(e))` reproduces entries exactly, so replay, resume, and recovery are untouched and a run over real files greps to ZERO plaintext PII while `Engine.stores` reads plaintext through the one policy point. (2) REDACTION POLICY: `redaction.patterns` adds host-defined patterns (RegExp or strings, compiled once, typed ConfigError on an invalid one) on top of the default credential set for every emitted event, via the new exported `compileSecretMasker`; the OTel exporter accepts the same `patterns` for trace parity. (3) EXPORT/IMPORT: `engine.exportRun(runId)` produces the portable bundle (meta, entries, blobs) read through the policy point, so encrypted deployments export plaintext for subject-access requests; `engine.importRun(bundle)` writes through the target's stores (re-encrypting under its policy), keeps the original runId, and refuses an existing run typed; together with the existing `deleteRun`/`pruneRun` this completes the retention/deletion/export surface. (4) SALTED METADATA DIGESTS: `security.argsHashSalt` switches `RunMeta.argsHash` to HMAC-SHA256 under a deployment salt (equal args stop correlating across deployments; low-entropy args stop being recoverable from the digest), `hashRunArgs` gains the optional salt, and the CLI resume args gate picks the salt up from `engineOptions.security` automatically. (5) AUDIT TRAIL: `reduceAuditTrail(entries)` folds a journal into the typed, ordered sequence of authority events (suspensions with deadlines, resolutions with who and what, abandons with reasons, engine decisions, termination denials, run settles), tolerant across journal vintages. New guide page: https://docs.rulvar.com/guide/data-protection.

## 1.57.0

### Patch Changes

- 5897232: Two follow-ups from the RV-210 and RV-215 cycles. (1) Resume of a run that already SETTLED ok no longer re-dispatches plain cap-expiry `limit` children live: the canonical replay predicate now takes a `runSettledOk` input (computed by the engine from the loaded journal's run settle entry), and the memoize-limit rule replays unstamped limit entries when the run is finished history, so resuming a completed run makes ZERO adapter calls and `replay --assert-no-live` style verification holds. Non-ok settles and never-settled journals keep the rerun retry semantics (a crashed segment still resumes into a second chance), and an explicit invalidate still forces a rerun. (2) `SqliteQuotaLimiter` carries its own class TSDoc (the api page previously inherited the bare SPI interface line), documenting the single-transaction admission, cross-process reconciliation, identical-rules requirement, pruning, and the busy_timeout contract.

## 1.56.0

### Minor Changes

- f26dba0: RV-215: distributed provider limiting. The new `QuotaLimiter` SPI is the extension seam for SHARED rate/quota limiting across engine instances and OS processes: `createEngine({quota: {limiter, tenant?, onLimiterError?}})` makes the engine reserve capacity before EVERY live wire dispatch (initial attempts, transport retries, and failover takeovers alike, in every phase), dimensioned by provider/model/tenant with a heuristic token estimate, and reconcile each granted reservation with the attempt's actual usage after the outcome settles. A denial becomes a synthetic rate-limit-class WireError that rides the existing provider-429 retry and failover machinery verbatim, except no wire call is paid: the limiter's retryAfterMs (the honest window remainder) drives the interruptible backoff, attempts stay bounded by RetryPolicy, exhaustion fails over (the takeover reserves under its own model), and the terminal is the typed `error` of kind `rate-limit`. `onLimiterError` decides what a limiter INFRASTRUCTURE failure means: `'deny'` (default) fails closed as a retryable transport-class denial, `'allow'` logs a warning and dispatches without a reservation. Quota admission is live-only by construction (nothing journaled; replay and resume of memoized work never touch the limiter), and an unconfigured engine takes the exact pre-quota dispatch path down to promise-tick identity. Two reference implementations share one rule model (`QuotaRule`: optional provider/model/tenant dimensions; `requestsPerMinute` exact and hard, `tokensPerMinute` estimated at admission and settled to actual; every matching rule must admit; fixed epoch-aligned one-minute windows; `validateQuotaRules` at intake): `memoryQuotaLimiter` in @rulvar/core coordinates engines inside one process, and `SqliteQuotaLimiter` in @rulvar/store-sqlite coordinates PROCESSES over one database file, with admission inside a single BEGIN IMMEDIATE transaction, cross-process reconciliation via reservation rows, lazy two-window pruning, and the store's boot-scoped busy retry; a multi-process test fleet of real engines proves the global cap holds (dispatched wire calls exactly equal recorded window consumption, no window over cap). `createTestEngine` in @rulvar/testing passes a `quota` option through to the engine.

## 1.55.0

### Minor Changes

- e9b005b: Close RV-210 in full: the partial-work contract. (1) Weighted tool units and per-tool call caps: `UsageLimits.toolUnits { max, costs? }` terminates as a plain `limit` when the weighted budget is reached (each executed call of tool T costs `costs[T] ?? 1`; denied calls cost nothing), and `UsageLimits.maxCallsPerTool { name: cap }` denies the excess call of a NAMED tool pre-dispatch with a typed error result (`guard: 'per-tool-cap'`, no budget or unit consumed; `0` bans the tool); both validate at intake, merge as whole-object per layer, and surface in `ExplorationSummary` as `toolUnitsUsed` / `deniedToolCap`. (2) The progress contract and the structured terminal partial: the stock `progressReportTool()` (`report_progress`) lets an agent state its facts, evidence refs, and open questions after every batch, and a `limit` terminal now keeps the LAST successful report as `AgentResult.partial` (derived deterministically from the transcript; a final boundary checkpoint pins the window so replay and recovery rebuild the identical partial; invocations that never report stay byte-identical). (3) Partial-child salvage: the digest of a limit child appends `partial: {...}`, `get_child_result` pages the full report, and `acceptance.acceptPartialChildren: true` counts a partial-bearing limit child as a success for both child policies (completion `'partial'`, the salvaged children listed in `salvagedPartialChildren` on the envelope and inside the single journaled acceptance decision; a bare limit child still rejects; one deterministic coordination-prompt line appears only when the option is on). (4) Profile templates with the stop conditions built in: `researchAgentProfile({ root })` composes the repository research toolset, the progress tool, and `RESEARCH_PROFILE_LIMITS`; `implementationAgentProfile` / `reviewAgentProfile` preset the caller's task tools with `report_progress` prepended under their own exported limit constants. Unconfigured behavior is byte-identical everywhere.

## 1.54.0

### Minor Changes

- 3f6bc03: Three improvement-plan remainders: the `run:end` semantic completion lift (RV-207 tail), the standard repository research toolset (RV-210), and incremental synthesis with pre-model claim deduplication (RV-211).

  **The completion lift.** Transport status and semantic completeness are different claims, and `run:end` now carries both: a workflow that returns an object result with a valid `completion` literal (`'complete' | 'partial' | 'rejected'`) and optionally a `childStatusCounts` record, or throws a typed error whose `data` carries them, gets both lifted onto the `run:end` event. The orchestrator acceptance path emits the envelope on every terminal, including the typed rejection (its `FailRunError` data now carries `completion: 'rejected'`). Malformed shapes stay silently absent, replay recomputes identical fields, the CLI progress line renders `completion=...`, and the OTel exporter maps `rulvar.run.completion` and `rulvar.run.childStatusCounts`.

  **The repository research toolset.** `repositoryResearchToolset({ root })` ships five `risk: 'read'` tools over a confined directory root: `list_files`, `search_files`, and `read_file` with deterministic byte ordering and STABLE keyset cursors (a page boundary never shifts when unrelated entries appear; every cursor embeds its query identity), plus `record_evidence`, which verifies citations at collection time (the file must exist under the root, `lines` must be a valid 1-based range inside it, `quote` must appear verbatim), and `list_evidence`. Pages are canonical: byte-identical however addressed, which is exactly what the exploration guards measure, so `maxRepeatedToolSignature` and `maxNoNewEvidenceCalls` compose with the kit instead of being defeated by marker fields. Absolute paths, `..` escapes, and symlink escapes are typed error results; the host reads collected evidence via `kit.evidence()`.

  **Incremental synthesis and claim dedup.** `synthesis.mode: 'incremental'` dispatches one bounded `synthesize`-role NOTE invocation per settled child the moment it settles (default `noteLimits` `{ maxTurns: 2 }`), overlapping the still-running fan-out, and the final result is a DETERMINISTIC reconciliation envelope (`IncrementalSynthesisResult`), never another model call; a dead note falls back to that child's raw digest summary under a journaled per-child `orchestrator_synthesis_note_fallback` decision, replay reproduces the envelope with zero paid calls, and `finishValidation` plus incremental mode is a `ConfigError` at intake because the reconciliation has no model-composed finish to validate. `synthesis.dedupeClaims: true` deduplicates repeated claim lines across children BEFORE any model call (whitespace-collapsed exact matching via the exported pure `dedupeRepeatedClaims`, never fuzzy): in single mode the digest keeps first occurrences with a `REPEATED CLAIMS` index riding the prompt, in incremental mode the envelope carries `repeatedClaims`. Both options default off and the synthesis prompt stays byte-identical when unset.

## 1.53.0

### Minor Changes

- b821bd1: Ship the RV-211 synthesis role and critical-path metrics. `InvocationRole` gains `'synthesize'`: the dynamic orchestrator's opt-in post-fan-in synthesis invocation (`OrchestrateOptions.synthesis { model?, effort?, limits?, instructions?, estCost? }`). With it configured, the coordination loop's `finish({ result })` becomes a draft and one fresh finish-only invocation with role `synthesize` composes the final run result from the goal, the draft, and the settled child digest, routable independently of coordination through the ordinary chain (the routing key picks its model and never summons it; no role effort default, like `loop` and `finalize`). Ordering and failure posture are strict: synthesis runs only after an accepted acceptance verdict; `finishValidation` validators bind the synthesis finish instead of the draft (same repair loop, same journaled verdicts); a dead synthesis falls back to the draft under a journaled `orchestrator_synthesis_fallback` decision and a warn log without validators, or fails the run typed (`data.source` `'orchestrator_synthesis'`) with them. The invocation is an ordinary journaled agent entry, so a resume replays it with zero paid calls (the prompt derives from journaled state, and the replayed root now awaits recovery before the digest fold). Telemetry: full `synthesize` span and phase pairs (`CostReport.byRole.synthesize`), a debug `log` event with the actual draft/digest/prompt sizes, and the new pure reducer `reduceCriticalPath(events)` (`CriticalPath`), which computes run wall, the post-fan-in interval, the synthesis wall, and their shares, so the improvement plan's post-fan-in gate (at most 40% of wall time) is a field read; the benchmark kit can expose any of them as metric extractors. `createTestEngine` routes `synthesize` to the fake model like every other model-picking key. Demonstrated against published 1.52.0 first: the whole orchestration emitted only orchestrate/loop roles, the final synthesis request ran on the coordination model, `byRole` had no synthesize bucket, the post-fan-in share was hand-rolled or nothing, and the synthesis vocabulary was silently ignored words.

## 1.52.0

### Minor Changes

- e138df9: Ship the RV-210 exploration guards (first slice): three opt-in `UsageLimits` fields that make an oscillating tool loop visible and boundable. `toolBudgetNotices` surfaces soft 50%/80% thresholds over `maxToolCalls` to the model as a plain user message with the exact remaining count (once per threshold, checkpoint-safe, inert with a loud warning without `maxToolCalls`). `maxRepeatedToolSignature` caps executions of the byte-identical call (tool name plus RFC 8785 canonical args): the excess call is never dispatched, the model receives a typed error result naming the count, the denial does not consume the tool budget, and `tool:end` carries `outcome: 'denied'` with `guard: 'repeated-signature'`. `maxNoNewEvidenceCalls` aborts the invocation as status `limit` with the new `abortClass: 'exploration'` when N consecutive successful executions return only already-seen result digests; the executed work is kept, the terminal memoizes, and the structured `ExplorationSummary` (`toolCallsUsed`, `distinctSignatures`, `repeatedCalls`, `duplicateResultCalls`, `deniedRepeats`, `byTool`) journals beside the abort class so a replayed consumer sees the same typed evidence with zero live calls. Whenever any guard field is configured the summary also rides the full `AgentResult` and the live `agent:end` event (live-only for non-abort terminals, like `transportRetries`); values JCS cannot serialize fail open (unique signatures, fresh evidence); on resume the guard rebuilds from the restored checkpoint messages. The CLI TUI renders the guard marker on denied tool lines and the OTel exporter maps the counters to `rulvar.exploration.*` and `rulvar.tool.guard` attributes. Unconfigured invocations are byte-identical to before. Demonstrated against published 1.51.0 first: the identical call executed six of six times with zero signal, the model never saw a remaining count, duplicate pages never flagged, and the terminal was a bare `limit` indistinguishable from honest work.

## 1.51.0

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

## 1.49.0

### Minor Changes

- bab7b2c: Make the agent event model unambiguous (RV-207): one `agent:start`/`agent:end` pair per logical agent span, a paired `agent:phase:start`/`agent:phase:end` per model invocation phase, an official reducer, and the OTel exporter leak the old shape caused is closed.

  Before this release one spanId emitted an extra unpaired `agent:start` for every phase of the dispatch (`loop`, then `summarize` per compaction, `finalize`, `extract`) with a single `agent:end`, so durations and attempts were underivable without heuristics: a consumer pairing starts with the end read the LAST phase's duration as the agent's, a starts-minus-ends gauge leaked one running agent per phase, and the shipped `toOtel` exporter (reproduced on the published 1.48.0) leaked a never-ended OTel span per multi-phase agent while the span it did close measured only the last phase. The replayed stream had a different shape than the live one (one start), so the same consumer built different tables live and on replay.

  Now every phase activation emits `agent:phase:start`/`agent:phase:end` keyed `(spanId, invocation)` (a 1-based activation ordinal; a summarize that fires three times gets three pairs), carrying the phase's role, the serving model, `durationMs`, the usage delta the activation added to its `(role, model)` slice (the pairs sum exactly to `agent:end` and to the journaled `usageByModel` split), `costUsd` priced at each serving model's own rate, a binary `outcome`, and `retries` (transport retries inside the activation). `agent:end` gains `retryCount`. The retry facts are live telemetry only, never journaled: replayed events omit them, and replayed phase pairs are reconstructed from the terminal entry's recorded slices with `durationMs` 0, so a live stream and its replay reduce to IDENTICAL usage and cost tables. `reduceInvocationTable` (new in `@rulvar/core`) is the official no-heuristics reducer: per-agent per-phase rows plus a per-role aggregate that matches `CostReport.byRole`; truncated streams stay honest (`open: true`), never guessed at.

  `@rulvar/cli`: `toOtel` maps each phase pair to an `invocation <role>` child span of its agent span with `gen_ai.usage.*`, `rulvar.cost_usd`, and `rulvar.retries` attributes, closes the agent span with the whole dispatch's totals and `rulvar.retry_count`, and an opener for an already-open span never duplicates it, so even a stream from a pre-RV-207 core cannot overwrite the tracked agent span and leak it unended. The progress renderer prints the phase lines (`agent w extract phase on model`, then the settle line with per-phase cost, tokens, duration, and retries). Journal bytes, cassettes, and toolset hashes are untouched: events are telemetry, never identity.

## 1.48.0

## 1.47.0

### Minor Changes

- a3687fe: Ship phase 3 of the fenced run state RFC, reconcile and recover. The engine now journals every run settle whose segment did durable work (or changed the recorded status) as a `run_settle` decision entry ordered BEFORE the meta write, so the run's outcome is part of the journal and `RunMeta` is a rebuildable projection; the write-on-change rule keeps pure replay byte stable, so a resume that only replays appends nothing. On top of it, `auditRun` names the divergences a worker sweep can never see, `auditRuns` sweeps the catalog, and `reconcileRunMeta` rewrites the sound cases from the journal with zero model calls and no workflow: `meta-behind` (the crash residue between the journal flush and the meta write, or a stale write contradicted by a journaled settle) takes the journaled status, and `stranded` (a terminal meta over live journal work, the F1 residue an unfenced store admits, demonstrated against the published 1.46.0 first) becomes sweepable again; ambiguous residues are reported as `suspect` and never rewritten. The CLI gains `rulvar runs audit [--repair]`, the operator probe: it lists every divergence, repairs under a brief per-run lease on a leasable store (a live owner is skipped, never raced), and exits 0 only when the catalog ends consistent. `ResolutionOutcome` additionally carries `woke: true` exactly when a resolution settled a live in-process waiter, and the HTTP server uses it to close a quiesce-window race: a resolve that applied through the fold while the segment was closing now awaits the imminent settle and continues the run in place instead of answering `resumed: false` on timing grounds and stranding it suspended. The committed cassette catalog is re-frozen for the additive settle entry under the journal-shape-revision lane of the fixtures lock: an additive journal evolution that revises no identity (the hashVersion stays 2; entry identity, adapter requests, and the frozen v1 resume fixtures are untouched byte for byte).

## 1.46.0

### Minor Changes

- 865e7bf: Close finding F2 of the fenced run state RFC with the sqlite transcript twin. `SqliteStore.transcripts()` returns a `TranscriptStore` that declares `fencedWrites` because its blobs live in the store's own database, beside the lease rows: a lease-carrying `put` or `delete` verifies the current holder of the run the ref's leading path segment names atomically with the blob mutation, in the same one-immediate-transaction shape as the journal side, and rejects stale or cross-run holders with the typed `LeaseHeldError` leaving the prior blob byte intact. Demonstrated against the published 1.45.0 first: the engine threaded the superseded segment's lease into its late checkpoint save, both shipped transcript stores ignored it, and the blob at the deterministic ref both segments share regressed to older turn state (the state a later boot decodes, replaying turns the successor already paid for) while the same holder's journal append bounced typed. Over the `{ journal: store, transcripts: store.transcripts() }` pair, `assertFencedWrites` now passes and every durable run mutation is fenced. The conformance kit gains `fencedTranscriptsConformance`, the executable definition of the transcript-side promise, taking a factory for the pair that shares the fencing domain; staleness is produced with release plus reacquire, so the suite needs no wall sleeps.

## 1.45.0

### Minor Changes

- b96305d: The fenced writes capability (the fenced run state RFC, phase 2). `JournalStore.putMeta` and `delete` and `TranscriptStore.put` and `delete` accept the same optional trailing lease that `append` always took, and a store declares enforcement with the `fencedWrites: true` marker: a mutation carrying a lease that is not the current holder for the mutated run rejects with the typed `LeaseHeldError`, atomically and leaving nothing changed, including a live lease for a different run. The engine threads the segment's lease into every durable mutation of a leased resume (meta writes, checkpoints, compaction summaries, worktree patches, workflow sources), so over a declaring store a superseded worker can no longer overwrite the successor's meta at its late settle and strand the run from worker sweeps, and its very first refused meta write now fails the stale segment typed at boot with zero paid calls. `SqliteStore` declares the marker and enforces it on `putMeta`, `delete`, and `append` (with the run-match rule as defense in depth); the conformance kit gains `fencedWritesConformance` as the capability's executable definition; the queue worker's retention sweep passes its brief lease through the new optional second argument of `engine.deleteRun` (`pruneRun` takes the same); and `hasFencedWrites` plus `assertFencedWrites` let a host assert the full fence at deployment time. Stores written before the capability are untouched: without the marker the extra argument is ignored and the journal-append fence works exactly as before.

## 1.44.1

## 1.44.0

### Minor Changes

- 299f7d2: Evidence preservation contract for the orchestrator finish (the improvement plan's RV-202 slice). The finish validation input now carries `children`: every spawned child at finish time, in spawn order, with its handle, nodeId, status, and full output text, a pure read of the durable state the orchestrator already tracks, so validators can hold the finish result against the evidence the children actually produced. The new `evidencePreservedValidator` enforces the plan's gate: at least `minShare` (default 0.95) of the distinct citations found in the outputs of children settled ok must appear literally in the result text, with the missing ones listed in the rejection so the bounded repair turn can restore them; `requireKnown: true` additionally rejects citations no child ever produced, closing the fabrication path that satisfied a plain count check. Purely textual and deterministic; verdicts journal exactly like every finish validation verdict, so replay and resume reproduce them without re-running validator code.

## 1.43.0

### Minor Changes

- 71b7181: Deterministic finish validators with bounded repair for the dynamic orchestrator (the improvement plan's RV-204 slice). `OrchestrateOptions.finishValidation` runs host validators over every schema valid `finish({ result })` call: a rejection returns the failure reasons to the model as the call's error tool result and grants a bounded repair turn (`maxRepairs`, default one); a rejection past the bound fails the run with the typed `FailRunError` (code `fail_run`, `data.source` `'orchestrator_finish_validation'`) BEFORE the acceptance settle, so acceptance never judges a rejected finish. Every verdict journals as a decision entry keyed by the finish call id, so a resume rolls the same verdicts forward without re-running validator code, and a journaled final rejection short circuits at boot without a model call. The toolset never changes and zero configuration adds zero journal entries, so existing runs and frozen cassettes replay byte for byte. Ships `requiredSectionsValidator`, `requiredFieldsValidator`, and `minMatchesValidator`, plus the `FinishValidator` contract for custom checks.

## 1.42.0

### Minor Changes

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

## 1.39.0

## 1.38.0

## 1.37.0

### Minor Changes

- e6b1481: Validate the persisted `KnowledgeSnapshot` on every `FileModelKnowledgeStore` read (v1.36.0 review P2-6). The old read checked only that `version` was a number, `hash` a string, and `claims` an array, so a hand edited or torn `rulvar.models.json` could forge a negative or fractional `version` and a mismatched `hash`, and a `null` or partial claim flowed on to crash the card render with an untyped `TypeError`. The read now requires a nonnegative integer `version`, a lowercase sha256 `hash` that MATCHES `knowledgeHash(claims)`, and structurally sound claims (a persisted snapshot may hold non active statuses), refusing any inconsistency as a typed `ConfigError` that names the offending path. `commit` reads first, so it refuses to append onto a corrupt base.
- e6b1481: Contain `FileTranscriptStore` refs under their configured root (v1.36.0 review SEC-P1). The per-segment check accepted `.` and `..` (dots are in its alphabet), so `join` let a `..` segment escape: a caller passing an untrusted ref to `put`, `get`, `list`, or `delete`, or an untrusted `runId` (which prefixes the checkpoint and workflow source refs), could read, write, or delete `.bin` files outside the directory. Every segment now must be a nonempty safe token that is neither `.` nor `..`, and the resolved path must stay under the resolved root. The engine also refuses an unsafe `runId` with a typed `ConfigError` before its first store write, so a compiled run cannot persist its source outside the transcript root.

## 1.36.0

### Minor Changes

- 101795b: Fix the v1.35.0 review P1 and the core P2 groups. The parked flavor B decision wait is abort aware: `handle.cancel()`, a `RunOptions.signal` abort, the run `deadlineAt`, and fail fast sibling aborts settle the run in bounded time instead of waiting out the escalation deadline; the suspension entry stays open so resume re parks it, worktree salvage still precedes destruction, and the wait rejects with the new `EscalationDecisionAbortedError`. `budget.atCap: 'fail-run'` is executable: the journaled cap decision drives the branch, the reserved finalizer is skipped, and the run fails with the new `FailRunError` (registry code `fail_run`), rolled forward deterministically on resume. `OrchestrateOptions` validate at construction (`maxSpawns`, `renderBudgetChars`, `budget.capUsd`, `budget.capFraction`, `budget.finalizeReserveUsd`, `budget.finalizeTurns`, and the `atCap` literal), and the digest render budget is a hard upper bound of the rendered row, marker included, at both distillation tiers. The extension seam gains an optional `terminate` capability so a journaled policy verdict can close the run typed. Knowledge and isolation intake validate too: `FileModelKnowledgeStore.activeClaimsCap`, `GitWorktreeProvider.maxPinnedWorktrees`, and `modelKnowledgeCard` `budgetChars` (now a hard bound of the whole card). The sweep also validated `escalation.minSpendUsd` (a NaN silently disabled the minimum spend gate) and gave `LeasableStore` the optional readonly `leaseTtlMs` capability.

## 1.35.0

### Minor Changes

- d4ac3bf: Validate every numeric engine option at its intake and survive far future deadlines (v1.34.0 review P2-1, P2-2, P2-3, P2-4). `createEngine` now refuses malformed `concurrency.perRun` and `concurrency.perProvider` caps, `budgetDefaults` fields, engine and profile `limits`, profile `estCost`, escalation `deadlineMs`, and compaction thresholds with a typed `ConfigError`; `engine.run` validates `budgetUsd` and `limits` synchronously and requires `deadlineAt` to be an ISO 8601 date-time with an explicit UTC designator or offset (an impossible calendar day is refused rather than silently rolled into the next month, and a malformed string no longer cancels the run after the first provider dispatch). `ctx.agent` validates `estCost` and `limits` per call, so a negative reserve can no longer shrink the committed total and admit a sibling past its ceiling, and the admission gate refuses a non finite reserve as a backstop. The per run semaphore requires a positive integer limit (a NaN cap used to park the first request forever with `cancel()` unable to settle the run) and queue waits are abort aware, so a cancelled run always drains its queued calls in FIFO order. Absolute deadlines (`RunOptions.deadlineAt` and the journaled escalation deadline) are honored through sliced timers beyond the Node timer maximum instead of firing immediately, while `streamIdleTimeoutMs` is bounded by that maximum like retry policy delays. `validateUsageLimits` is exported for hosts that want the same check at their own boundary.

## 1.34.0

### Minor Changes

- f1505ec: `mcp()` now returns a `McpToolSource`: the frozen `ToolSource` seam plus an idempotent `close()` that releases everything the source created on first use, the SDK client, its transport, and, for stdio, the spawned child process. Without it a one shot host that ran a workflow over a stdio MCP server could never exit naturally, because the child and its pipes kept the event loop alive (v1.33.0 review P2). `close()` resolves even when the connection never succeeded, and it resets the source, so a later `tools()` call connects afresh; a failed connect now also releases its transport and child on the way out instead of leaking them behind the error it rethrows. The engine still never closes a source, because one source may serve many runs: the host owns the lifecycle, and the MCP guide documents the `try/finally` pattern for one shot scripts. Real stdio and streamable http integration tests now cover both external transports, including child process release, reconnect after close, and cleanup after a failed connect.

## 1.33.0

## 1.32.0

## 1.31.0

## 1.30.0

### Minor Changes

- 87ce985: Validate every RetryPolicy before anything runs under it (v1.29.0 review P2). Published 1.29.0 accepted `attempts: 0`, fractional and NaN attempts, negative backoff numbers, and a NaN factor, then dispatched the adapter under them: the invalid values silently reshaped retry semantics (zero or NaN attempts behaved as no retries; a negative initialMs or NaN factor collapsed the delay to zero, removing backoff entirely). The new exported `validateRetryPolicy` enforces the documented contract, a positive safe integer `attempts` (the engine always makes the first try, so zero attempts has no meaning), timer safe integer `initialMs` and `maxMs` (`maxMs` below `initialMs` stays legal as a `Math.min` ceiling), a finite positive `factor` (below 1 is a legal decaying backoff), a boolean `jitter`, and unique known `retryOn` classes, and throws a typed `ConfigError` naming the offending field and its config source. `createEngine` validates `defaults.retry` and every profile retry at construction; the per call merge in `ctx.agent` validates the winning policy before identity, admission, or any journal append, so an invalid policy can never reach a provider or record a partial agent execution.

## 1.29.0

### Minor Changes

- 621d566: Make the retry and failover backoff interruptible and validate every provider supplied retry delay (v1.28.0 review P1 and P2).

  The retry engine now races its backoff wait against the host cancel signal (which the run deadline also drives) and the budget ceiling signal: an abort wakes the wait immediately, settles through the canonical aborted outcome (`cancelled` or `exhausted`, with every already recorded usage kept), and forbids every further dispatch, including the one behind a keyed limiter queue, so an adapter that ignores its signal can no longer be re entered after an abort. Previously a provider supplied `retryAfterMs` armed an uninterruptible sleep: a cancel, a crossed deadline, and a crossed budget ceiling all waited out the full backoff and the adapter was dispatched again. The injected `retry.sleep(ms)` test hook keeps its signature; a hook that loses the race is abandoned without an unhandled rejection, and the native timer path clears its timer so an abandoned long backoff never pins the event loop.

  `retryDelayMs` is now the defensive boundary the docs promise: only a finite nonnegative provider `retryAfterMs` replaces the computed delay, anything else (NaN, Infinity, a negative) is ignored as adapter noise, and every returned delay is a finite nonnegative integer clamped to the Node timer maximum, so a malformed or huge value can never arm an instant or overflowing timer. Both first party adapters stop emitting unvalidated `Retry-After` parses: an unparsable header (the HTTP date form included) omits `retryAfterMs` entirely instead of producing NaN (which also broke the `WireError.data` Json invariant by serializing to null), and a huge but finite value is clamped. The `mapAnthropicStream` TSDoc now states precisely how a truncated stream is reported (the `finished` flag on the return value, with the adapter synthesizing the terminal error).

  Four frozen fixture cassettes are refrozen for this release (the hashVersion-bump refreeze ceremony applies; hashVersion itself is unchanged and existing journals replay identically): in three cap freeze scenarios the main orchestrator entry now honestly settles cancelled at the cap instead of paying one more ordinary turn whose result the forced finish machinery discarded anyway, and one scenario loses a post abort wait suspension that can no longer be dispatched. Entry identities, keys, and every other row are byte identical.

## 1.28.0

### Minor Changes

- d98eb0b: Enforce the terminal stream contract end to end (v1.27.0 deep E2E review P1 and P2). The runtime now fails closed when an adapter stream drains without a terminal `finish` or `error` event: the partial turn becomes a retryable transport fault that feeds the ordinary retry and failover machinery instead of settling as `ok` with truncated text, and a requested abort (cancel, budget ceiling, idle severance) remains a clean end with no fabricated provider error. Consumption stops at the first terminal event, so events after `finish` can no longer mutate the value, revise the authoritative bill, or trigger tool execution. The first party adapters enforce the same contract at the wire: the Chat Completions mapper no longer synthesizes `finish: stop` when the stream is cut before a `finish_reason` (usage the provider did report is still forwarded, half assembled tool calls are dropped), the Responses mapper fails closed on EOF without a response terminal event, and the Anthropic adapter surfaces a read cut before `message_stop` as a retryable transport error and no longer converts a caller requested abort during `messages.create()` into a terminal error. `mapResponsesStream` and `mapChatCompletionsStream` accept an optional `signal` so a requested abort keeps ending the stream without a terminal event. The VCR `record` wrapper now commits its cassette row even when the consumer stops reading at the terminal event (the engine always does now); adapter middleware must not rely on being drained past the terminal. The committed `combined-loop-descent` catalog cassette is refrozen because stopping consumption at the terminal shifts the deterministic interleaving of two parallel plan children by one scheduler turn; entry content, keys, and the actual `hashVersion` are unchanged, journals recorded under earlier versions replay unchanged, and this changeset carries the frozen fixture gate's hashVersion-bump ceremony token only to unlock that refreeze.

## 1.27.0

### Minor Changes

- 884a433: Types referenced by public signatures are now exported from their package barrels, so the API docs resolve them instead of carrying known incomplete references (v1.26.0 deep E2E review): `BaseAppend` from `@rulvar/core` (the fields common to every `Replayer` append), `Block` and `MappedStop` from `@rulvar/anthropic` (the wire level content block alias and the stop reason mapping), and `VcrHeader` from `@rulvar/testing` (the first line of every cassette file). The frozen TypeDoc baseline shrinks from eleven entries to the four vendored Standard Schema notices.

## 1.26.0

### Minor Changes

- a4fc757: Scale fixes from the v1.25.0 review. `RunHandle.events` keeps its gapless contract (buffered from handle creation) but drains linearly: the iterator queue uses a head index with in place compaction instead of `Array.shift()`, so a late read of a 100k event backlog takes milliseconds instead of seconds, and delivered events are released eagerly. `engine.pruneRun` now collects exact whole string references in one recursive pass over the journal (values and object keys) instead of a per terminal substring scan: a checkpoint ref that is a prefix of another (`ckpt/2` inside `ckpt/20`) no longer survives pruning, matching what the stores and durability guides always promised, and the scan is linear in journal size instead of quadratic in entries. New optional store capability `MetaLookupStore.getMeta(runId)` with the `hasMetaLookup` guard and the `readRunMeta` helper: `engine.resume` and every shell point lookup use it when present and fall back to the historical `listRuns` scan otherwise; all three shipped stores implement it and the serialization wrapper preserves it. `RunFilter` gains an advisory `statuses` array (match any, combining with `status` as either matches; the shared predicate ships as `metaMatchesFilter`). `RunMeta` gains `genesis`, a generation token minted at the fresh start and preserved verbatim across resume segments, so a `deleteRun` and recreate of the same explicit runId is distinguishable from the original run.

## 1.25.0

## 1.24.1

### Patch Changes

- 0bb14db: Correct the `RunMeta.argsHash` documentation (v1.24.0 review P2-2). The digest is a deterministic, unsalted SHA-256 over the JCS form of a run's genesis args, so it reveals when two runs shared identical args and low-entropy args (a boolean, an approval flag, a role, a short id) are recoverable by hashing candidate values. The TSDoc on `RunMeta.argsHash` and `hashRunArgs` no longer claims that nothing sensitive lands in meta; it now states the digest is sensitive-derived metadata that confers no confidentiality and must be access-controlled like the journal and transcripts. The raw args are still never journaled, and no runtime behavior changes.

## 1.24.0

### Minor Changes

- 2b033e8: Record the genesis args binding in RunMeta and make the dry-run preview mutation-free (the v1.23.0 review). `RunMeta` gains `argsProvided` (whether the run started with defined args) and `argsHash` (sha256 over the JCS canonical serialization of the genesis args, never the raw value), written by the engine at genesis and preserved verbatim by every resume segment, so hosts can refuse a resume whose re-supplied args silently diverge from the original invocation; the new public `hashRunArgs()` derives the same hash host-side. Legacy metas never gain the marker retroactively, and unserializable args record presence without a hash. A `dryRun` resume now performs ZERO store mutations by invariant: `putMeta` is skipped entirely (no status flip, no `segments` bump), the compiled-source blob is not re-put, and the Replayer's single append site refuses any journal append under replay-strict with a typed `JournalMissError`. The store conformance kit checks the round-trip of both new fields.

## 1.23.0

### Minor Changes

- 1f9c272: Resume correctness and telemetry integrity, the v1.22.0 review's two P1 findings plus the event-layer P2s.

  - **Resume ordinal continuation (P1-1).** Since M2, the ordinal map key minted for new operations and the key used to seed that map from prior entries on resume were built by two hand-written composites whose separators differed, and the minting one contained an INVISIBLE literal NUL byte in the source, so the seeding filled a bucket `mint()` never read. Every identical-identity live operation after any resume re-minted ordinal 0, duplicating the journal identity triple `(scope, key, ordinal)` and corrupting sibling binding on the next replay. Both sites now go through one `ordinalMapKey` helper (escaped `U+0000` separators, no printable-separator aliasing), the seeding computes an order-independent max, and the regression suite covers identical siblings across suspend, process recreation, and replay-strict re-resume. No `CURRENT_HASH_VERSION` change: ordinal bookkeeping never entered content-key derivation, and journals written by broken versions still load (their ordinals seed the map exactly as recorded).
  - **Event `seq` and `spanId` durability across segments (P1-2).** Every resume segment restarted the telemetry counters at 0, so one `runId` repeated `seq: 0` and `spanId: 's0'` per segment, against the documented per-run contracts, and the CLI SSE `Last-Event-ID` cursor became ambiguous. `RunMeta` gains an optional `segments` count, bumped durably at every segment start strictly BEFORE the segment's first emission (crash-safe: a killed segment still advanced it), and each segment seeds `EventBus` and `SpanRegistry` at `segments * EVENT_SEGMENT_STRIDE` (exported, informational). `seq` stays a plain number, strictly increasing across the whole run and NOT contiguous across segments; span ids never repeat. Stores must round-trip the new field (the conformance kit now checks); a store that drops it degrades telemetry counters to per-segment, never the journal.
  - **Listener-failure ordering and masking (P2-1).** The v1.22.0 subscriber-isolation warn was delivered mid-fan-out (observers saw it BEFORE the event that caused it, with descending seq) and was built outside the masking boundary (a key-shaped fragment of the listener's error reached observers raw). The warn now goes through the ordinary `emit()` after the triggering event's fan-out completes: masked like every event, seq stamped at delivery, `[event, warn]` order on every surface, still at most once per bus and recursion-proof.
  - **Spawn admission events on every boundary (P2-5).** `spawn:admitted` only ever fired from the dynamic orchestrator's spawn tools; `ctx.agent` lineage admissions and `ctx.workflow` child admissions emitted nothing (`ctx.workflow` not even `spawn:rejected`). All admission boundaries now emit both events through one helper; journal-recovered decisions re-announce with `replayed: true` when they take effect, and a cleanly replayed dispatch does not re-announce. `spawn:admitted.spawnUnitsAfter` is now optional: absent on lineage-layer admissions, whose spawn-unit debit rides the dispatch itself.
  - **The replayed flag actually reaches observers.** The engine's internal event sink dropped the third argument of `emit`, so every `replayed: true` marker (replayed agent and tool lifecycle events, recovered suspensions, recovered rejections) was silently stripped since M2 and rendered as live. The sink now forwards it; the documented replay re-emission table is true again.
  - **`SANDBOX_AGENT_OPT_KEYS` exported.** The sanctioned sandbox agent-option allowlist is a documented public constant, the single source for the runtime validator and the planner API card.

## 1.22.0

### Minor Changes

- 77b554f: Add `sanitizeTerminalText`, the rendering-boundary counterpart to `maskSecrets`: it neutralizes terminal control sequences and control characters in one untrusted string so a provider error message, tool name, model id, or log line can never inject a control sequence or a second physical line into a rendered terminal line (v1.21.0 review P2-1). After sanitization the result carries no C0 control, no `DEL`, no C1 byte (including every 8-bit escape-sequence introducer), and no ESC-initiated CSI/OSC/DCS sequence; control runs collapse to a single space and visible text is preserved. The bundled renderers use it internally, and it is exported for host terminal sinks.

  Also isolate event-bus subscribers: a throwing `on()` listener (a renderer, a metrics hook) is best-effort telemetry and can no longer propagate out of `emit` to disrupt a paid run; the failure surfaces once as a warn log on the same bus instead (v1.21.0 review follow-up).

## 1.21.0

### Minor Changes

- 7ee42a0: Enforce the financial-telemetry invariant at the adapter boundary for every adapter, injected clients and mocks included (v1.20.0 review P1-1). Every canonical token count must be a finite nonnegative integer with the cache subsets inside the full input; a violation fails the call loud as a typed transport-class terminal while accounting sees only conservatively sanitized values (garbage floors to zero, fractions round up, so a repaired charge is never an undercharge and never a credit). Both inlets are guarded: finish usage and mid-stream usage deltas, which previously reached the budget with no clamp at all. New exports `usageViolations`, `sanitizeUsage`, `sanitizeUsageDelta`, `snapshotUsage`, and `sanitizeTokenCount` carry the shared rules; the accounting boundaries snapshot adapter-owned usage objects before validating them, mid-stream deltas are repaired per field without the whole-usage subset rule (partial increments legitimately carry cache counts alone), counts are bounded to the safe integer range, mid-stream reports the finish total does not confirm fail the call loud with over-reported cache reads re-debited conservatively at the input rate, a duplicate finish or a post-finish usage event is refused, checkpoint restores sanitize the persisted counts exactly like the resume seed, and every cost fold treats a NaN or negative priced amount as unpriced instead of poisoning the totals. RunBudget grows defense in depth behind the validator: hostile priced amounts clamp to zero with a one-time error event, `spentUsd` stays finite and monotone under fuzzed hostile usage, and NaN or negative ceilings and resume seeds reject up front as `ConfigError` instead of silently disarming every comparison. Journal entries also gain the optional policy field `usageSemantics` (adapter-declared, never identity), and resuming a journal whose unstamped OpenAI entries carry cache writes emits a one-time `RULVAR_LEGACY_CACHE_SEMANTICS` warning pointing at the audit procedure (v1.20.0 review P1/P2-2).

## 1.20.0

### Minor Changes

- 9367030: `CostReport.byRole` now attributes every paid invocation phase to its own bucket. Usage accumulates by (invocation role, serving model): `UsageSlice` gains an optional `role`, terminal entries and turn-boundary checkpoints persist the roled slices, and both the live buckets and the pure journal fold bump `byRole` per priced slice, so a routed finalize, a separate extract, or a mid-loop compaction summarize lands under `finalize`/`extract`/`summarize` even when one model serves several phases of one agent (previously the whole entry folded under its single primary role and those documented buckets could never be nonzero). Backward compatible end to end: slices without a role and entries without slices fold under the entry's primary `costAttribution.role` exactly as before, pre-split checkpoints restore under the primary pair, a single-phase single-model call still writes no slices (those journals stay byte-identical), and role buckets and model buckets both sum to the same total on live runs, same-engine replay, and fresh-engine replay.

## 1.19.0

### Minor Changes

- 8cc9a9c: The finalize synthesis invocation now appends a deterministic synthesis instruction (`FINALIZE_SYNTHESIS_INSTRUCTION`, exported) to its request, and a non-truncated empty synthesis falls back to the loop turn's text instead of erasing it. Previously the routed finalize call sent the projected transcript ending at the assistant message with no instruction at all; a real model reads that as a fresh conversation opening, and its greeting unconditionally replaced the loop's correct answer as the schema-free output (reproduced live: a tool loop that had already answered `42` returned `How can I help?`). The instruction is request-only: the durable transcript keeps the raw history, so journal identity, extract input, and replay are untouched, and no recorded fixture moves. The truncated-empty synthesis case stays a bounded `output-truncated` failure. An opt-in live smoke (`RULVAR_LIVE_TESTS=1` plus `OPENAI_API_KEY`) pins the contract on a real provider.
- 8cc9a9c: `orchestrate(engine, goal, opts?, runOptions?)` and `orchestratePlanned(engine, goal, opts?, runOptions?)` accept the created run's `RunOptions` as an optional fourth argument, threaded verbatim to `engine.run`. `runOptions.budgetUsd` is the ROOT hard ceiling over the whole tree (the orchestrator and every child), immutable after start and frozen into `RunMeta`, while `opts.budget` only shapes the orchestrator's own sub-account inside that ceiling; the two layers were previously conflatable, and the canonical shortcuts could not set a root ceiling (or signal, runId, limits, deadline) at all without dropping to `engine.run(makeOrchestratorWorkflow(goal, opts), undefined, runOptions)`. Purely additive; existing calls are unchanged, and a call without `runOptions` still starts an UNCAPPED run, which the docs now state explicitly.

### Patch Changes

- 8cc9a9c: Internal real-time reads bind the wall clock at module load, never the live global, eliminating false `RULVAR_BARE_DATE_NOW` warnings for consumers whose rulvar frames live outside `node_modules` (workspace dists, monorepo checkouts). Two composing defects: `createEngine` captured `Date.now` per call, so an engine created after a previous run had installed the dev-mode patch bound the PATCHED wrapper as its real clock (its `EventBus` then warned from the engine's own frames), and the ULID factory read the live global at every mint, so ids minted mid-run (the orchestrator extension IO, PlanRunner revisions, adapter id maps) routed through the patch too. The engine now uses a module-load `realNow` binding (module load always precedes the first patch install), the vendored ULID factory defaults to its own module-load clock, and `@rulvar/store-sqlite` follows the same convention. The dev-mode guard itself is untouched and stays exactly as sharp for workflow code, which keeps reading the live global.

## 1.18.0

### Minor Changes

- 943962d: Registered toolset names now resolve everywhere a tools option is taken. A string entry of `AgentOpts.tools`, a profile's `tools`, or the sandbox dialect's `tools` names a toolset registered under `createEngine({ defaults: { toolsets } })`, expanded through the same canonical `resolveToolset` path as ToolDef and ToolSource values: unknown names are a typed `ConfigError` at spawn time before any provider call, duplicates and collisions are validated after the union, the resolved contracts land in `toolsetHash` and the journal identity exactly like directly passed definitions, and registry values may not nest other names, so no cycle can exist. This closes the v1.17.0 review P1-3: the planner API card and the docs taught `tools: ["name"]`, the sandbox bridge required strings, and the core rejected every string, so the documented construct could never run. `profileCard` now renders the registered toolset names as a closing line when the registry is non-empty (byte-identical output for engines without toolsets), so a planner can only name declared registries. Migration: strings previously always threw (`tools by registered name ... are not supported here`); they now resolve or fail with `unknown registered toolset '<name>'`. No behavior changes for ToolDef and ToolSource entries.

## 1.17.0

## 1.16.2

## 1.16.1

## 1.16.0

## 1.15.0

## 1.14.0

## 1.13.0

## 1.12.0

### Patch Changes

- 46edcc0: An exhausted run settle no longer drops the typed failure when the throw was an `AgentCallError`: the exhausted branch now projects it through `agentResultWire` exactly like the error branch, so `outcome.error` keeps the agent's typed budget failure (and any engine-decided abort class) in the parallel-exhaustion race where one branch's agent fails while the run budget is already exhausted. The common paths were already typed: a direct `BudgetExhaustedError` carried its wire before, and the in-loop turn-guard denial surfaces as `budget_exhausted` with zero over-ceiling calls, now pinned by an engine-level regression test.

## 1.11.0

### Minor Changes

- 0c70c5e: Close the execution segment at settle: exactly one segment owns a run (v1.10 deep E2E review, P1). Previously, `resolveExternal` on a handle whose `result` had already settled `'suspended'` silently woke the parked body through the live registry, and the documented resolve-then-resume sequence then started a second segment over the same journal: the approved tool executed twice, the post-approval turn was paid twice, and both segments minted the same journal seq (two terminal agent entries with duplicate seqs). Now every settle closes the registry: parked branches never run again, a post-settle `resolveExternal` validates like the live path and appends the durable resolution through the journal fold WITHOUT waking anything, and the one continuation belongs to the next `engine.resume`. The pre-settle live path (resolving from an `approval:pending` listener) is unchanged. Repeated resolution is now the documented no-op instead of a throw: once the target suspension is closed, `resolveExternal` returns `{ applied: false, reason: 'already_resolved' }` (journaled through the first-closing-wins arbiter) rather than `InvalidResolutionError`; an unknown key still throws, and an invalid payload still throws without journaling. Segment ownership is also enforced at the front door: a second concurrent `engine.run` or `engine.resume` of a runId that already has a live segment in the same engine throws a typed `ConfigError` before any side effect. Defense in depth at the store boundary: `InMemoryStore` and `JsonlFileStore` now enforce the monotonic-seq obligation, rejecting an append whose `seq` is not strictly greater than the stored tail with the typed `JournalOrderViolation`, so two stale-tail writers can never both persist. New public API: `ExternalRegistry.close()`, `ExternalRegistry.closed`, and `ExternalRegistry.suspensionKeyOf(entry)`. Docs: `guide/durability#resolving-a-settled-run` states the ownership rule and both safe orders; tools, testing, troubleshooting, CLI, stores, and store-authors pages align with it, and the documented sequences are now executable regression fixtures.

## 1.10.0

### Minor Changes

- 0e8d78e: Settle empty max-tokens turns as a typed output truncation, never an empty success. A schema-less turn (no schema, no required terminal tool) whose completion ends with finish reason `max-tokens` and no visible text now settles `limit` with the new `abortClass: 'output-truncated'`, a terminal-kind error, and an actionable message, instead of `ok` with `''`. The same check covers a routed finalize invocation, whose synthesis is the schema-less answer; a max-tokens turn with visible text keeps settling `ok` with the partial text. Like the no-progress abort, the truncation stamps `memoizeOutcome` on the terminal entry, so every resume replays the typed outcome with zero provider calls. The abort class now rides every projection of the failure: the journaled terminal error payload, the run-level `outcome.error.data`, dropped items, and thrown `AgentCallError` wires, so consumers such as the planner see the typed truncation instead of burning self-repair rounds on `compile/empty-source` under an unchanged output limit. `AbortClass` widens to `'no-progress' | 'output-truncated'`, and the projection helper is exported as `agentResultWire(result, fallbackMessage)` alongside `agentErrorToWire`.

## 1.9.0

### Minor Changes

- 3a53383: Report pricingVersion drift on resume.

  The `orchestrator_budget_reserve` decision already pins the `pricingVersion` in effect when a run started, but the resume recovery only compared the frozen cap dollars. A resumed run now also compares the journaled version against the live table (`unpriced` when priced from the adapter caps fallback) and emits `termination:config-drift` with field `pricingVersion` when they differ. The divergence is reported, never honored or refused: price interpretation is live by design (the journal stores usage; dollars are re-derived from the current table against the frozen cap dollars), replay stays byte-identical, and no provider work is repeated. Reserve decisions journaled before the field shipped resume quietly.

## 1.8.0

### Minor Changes

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

### Patch Changes

- 25724b5: The no-progress abort message now links the public docs (https://docs.rulvar.com/guide/agents#the-agent-loop-and-turns) instead of the retired internal spec reference "docs/06 Appendix A". Runtime-visible errors reference public documentation only. The stall-streak cassette embedding the message was re-recorded byte-for-byte otherwise; hashVersion stays 2, but the fixture lock refresh requires the hashVersion-bump token.

## 1.7.0

### Minor Changes

- 45285aa: Budget exhaustion errors now name the ceiling that actually ended the work. `BudgetExhaustedError` from agent execution reports the first closed account walking up from the debited scope (its scope, ceiling, spend, and reserves) plus the run root state, classified as `root`, `orchestrator-cap`, or `child-account`, both in the message and in typed `data`; a crossed orchestrator cap no longer masquerades as `run budget ceiling reached`. `RunBudget` gains the `exhaustionDiagnostics(scope)` projection behind this, and the orchestrator emits a warn log when an explicit `budget.capUsd` is silently bounded by the default `capFraction` 0.2 of the run ceiling (pass `capFraction: 1.0` to make `capUsd` the sole bound; the docs now spell out the min formula trap).
- 2f20d1d: `CostReport` is now replay stable and internally consistent: the engine builds every settled outcome's report from one pure journal fold (`costReportFromJournal`), so a replay only resume reproduces the complete report byte for byte, including the orchestrator block (`spentUsd`, `share`, `wakes`, `forcedFinish`, `reserveUsedUsd`), which previously read this process's live budget accounts and collapsed to zero on replay. Terminal entries now carry additive `costAttribution` facts (phase, agent type, primary role, debited budget account, finalize reserve flag); they are policy, never identity, exactly like `usageByModel`, and entries written before the field shipped fold under documented fallback buckets. One inclusion policy applies to the total and every breakdown alike: non abandoned terminal usage exactly once, so `byModel`, `byPhase`, `byAgentType`, and `byRole` each sum to `totalUsd` even after resumes that re paid attempts. `orchestrator.wakes` now counts armed (journaled) wake suspensions. The frozen cassette catalog was re recorded for the new journal byte form; identity derivation is untouched and old journals replay unchanged (the hashVersion stays 2; the token hashVersion-bump here sanctions the fixture lock refresh ceremony, not a version change).

### Patch Changes

- 22f65a8: The development mode bare nondeterminism detector no longer warns when Node's own machinery consults `Date.now` or `Math.random` inside a run's async context. Frames with `node:` specifiers (the undici transport behind global `fetch`, timers, stream internals) are now classified as library provenance alongside `node_modules`, eliminating the false `RULVAR_BARE_DATE_NOW` observed at `processResponseEndOfBody` during in run `fetch` calls. Direct calls from workflow files still warn exactly once per run.
- 2ddfa29: Documentation: the mode (c) resume contract is now stated as it actually works. `orchestrate()` builds its workflow internally and never registers it, so bare `engine.resume(runId)` cannot resolve it; the orchestration modes guide and the resume table now document the two working forms, `engine.resume(runId, makeOrchestratorWorkflow(goal, opts))` with the original inputs or a one time registration under `defaults.workflows` with `ORCHESTRATE_WORKFLOW_NAME`, with an executable test covering both, and the troubleshooting guide gains the symptom first entry for the `rulvar-orchestrate` not registered error.
- 2abd9c2: A resumed dynamic orchestration now honors the documented mode (c) contract after a budget cancelled root. Recovery is orchestration scoped instead of attempt scoped: journaled spawn decisions recover across root attempts (they live at the orchestrate call's own stable scope), recovered children re dispatch pinned to their journaled child scope so settled ones replay by content key for free and only dangling ones rerun, prior attempt handles alias to the recovered records so a restored transcript's await and cancel calls keep working, and the rerun root boots from the cancelled attempt's last turn boundary checkpoint instead of re planning from scratch. A regenerated turn that diverges from a lost one decides fresh (the recovered verdict binds only when the incoming spec matches the journaled one). Previously the rerun derived its recovery scope from the new dispatch seq, saw nothing, re decided every spawn, and re paid completed children.
- 1c1175d: An agent configured with a required terminal tool (the dynamic orchestrator's `finish`) no longer settles ok on a turn that ends without any tool call. Such a turn, including one cut by the output token bound before any call, now consumes the no progress budget and re prompts the model toward the tool, so `orchestrate()` returns ok only after a validated `finish({ result })` was intercepted; a model that never complies terminates as a bounded typed `limit`, never as ok with unproven output. The forced finish exhaustion path keeps synthesizing its documented partial. Ordinary `ctx.agent` calls without a terminal tool are unchanged.

## 1.6.0

### Minor Changes

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

### Patch Changes

- da4dbad: Write the product name as Rulvar in prose: package READMEs, npm descriptions, and the
  documentation site now capitalize the brand. Identifiers keep their exact casing, so
  package names, the `rulvar` binary, `rulvar.config.mjs`, the `.rulvar` store directory,
  the `rulvar.*` OTel attributes, and every URL are unchanged. Documentation and metadata
  only; no runtime behaviour changes.
- 487da86: Align every budget claim with the enforced contract.

  One precise formulation now appears everywhere the budget is described (README, docs landing, quickstart, budgets guide, design principles, invariants table, and the `RunOptions.budgetUsd` API comment): an immutable run budget with pre-dispatch reservation (projected admission, exact fill allowed), a budget-derived `maxOutputTokens` clamp on every turn, live stream cuts on crossing, and a documented provider-dependent residual overshoot of at most one clamped in-flight turn per concurrent agent. No surface claims a literal hard dollar cap without stating the bound in the same breath.

## 1.5.2

### Patch Changes

- 54936a0: Assemble the Slack and Google credential samples in the masking policy test at runtime so public secret scanners stop flagging the source blob; the runtime strings the policy masks are unchanged.

## 1.5.1

### Patch Changes

- 6c6d56f: The too-old-journal refusal no longer points at an export that does not exist.

  `JournalCompatibilityError` with subCode `HASH_VERSION_TOO_OLD` interpolated the version into a symbol name, so a v0 journal produced the hint `enable deriverV0 from @rulvar/compat via extraDerivers`. `@rulvar/compat` ships `deriverV0Synthetic`; there is no `deriverV0`. A reader with a genuinely too-old journal was sent to an import that is not there, and a dead end is worse than no hint.

  The hint now names the mechanism and the package, never a symbol, so it cannot go stale when a frozen profile is named something else:

  ```
  register a hashVersion 0 KeyDeriver through createEngine({ extraDerivers });
  @rulvar/compat ships the frozen profiles
  ```

  Nothing else changes: the refusal is still typed, still raised before any live call, append, or admission reserve, and `extraDerivers` still reopens the window exactly as before.

## 1.5.0

### Minor Changes

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

## 1.3.2

### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.

## 1.3.1

### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.

## 1.3.0

### Minor Changes

- 7d1a287: ModelKnowledge phase 3, first slice (M12-T02, unlocked by the passed measured-value checkpoint): the kb_propose orchestrator tool and the quarantined modelObservations write path. PlanRunner registers kb_propose on explicit opt-in (PlanRunnerOptions.kbPropose, like any opt-in tool); its payload is tier-relative (the orchestrator never names a model) and the engine resolves the tier against the referenced lineage's declared ladder into the concrete KbProposal subject, validates that the tier has a journaled attempt and that evidence refs resolve to this run's decision entries, and journals the proposal as the observation_add ledger.op through the single-writer path. Quarantine is absolute: the ack is entryRef only, ledger_read withholds observation content behind a count (byte-stable for observation-free renders), worker prompts never see it, and nothing can commit during a run (the runtime handle has no write path by API shape); proposals reach the human gate only through the post-run LedgerExport. Core exports KbProposal, KbProposalTrigger and the typed model-free proposalStatement template. The kb-propose-quarantine cassette joins the frozen catalog (61 IDs).

## 1.2.0

### Minor Changes

- 890f42c: The knowledge card gains the profile-evidence section (docs/05 section 4.3 as amended): eval-measured claims project onto the advertised spawn vocabulary, one line per concrete-model profile with a conservative weakness-over-strength fold across efforts, plus a fixed spawn-guidance line. FR-607 commits the card to feeding agentType choice at spawn, and the M12 checkpoint measured that tier-relative rows alone carry no agentType-actionable signal (criterion 2: equal quality, cost overhead, no steering). Ladder declarers and model-less profiles do not participate; the section renders only when at least one profile line exists, so every previously recorded card stays byte-identical; model names still never render.

### Patch Changes

- 3bfaec0: A capped orchestrator dispatches its own agent with estCost equal to its effectiveCap, and the forced-finish agent with the finalize reserve (docs/07 section 12.2 as amended): layer 2 makes those the true admission worst cases. Without the hints the default reserve priced the model's full maxOutputTokens (about one dollar on strong tiers) and the commitment rode the whole ancestor chain for the orchestrator's lifetime, so small run ceilings sat at zero admission remainder and every child spawn died with a budget rejection. Found live by the M12 checkpoint: no orchestrated child was ever admitted under the case ceilings, and both A/B arms measured a self-solving orchestrator instead of agentType selection.
- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.

## 1.1.0

### Patch Changes

- d16b04a: Plain orchestrate treats ladder-declaring profiles as declaration-only (docs/07 section 10 as amended): the spawn vocabulary in the profile card advertises concrete profiles and lists declarers on a separate context line, and spawn_agent naming a declarer is rejected with a typed ConfigError before admission instead of dying later at wire resolution. Found live by the fifth M12 checkpoint run: the knowledge card praises ladder tiers by profile name, so the card-informed arm kept spawning the declarers and measured far below the uninformed baseline.

## 1.0.0

### Major Changes

- 464ab6e: rulvar v1.0.0: the first published release. An embeddable TypeScript engine for durable, budget-bounded, testable multi-agent LLM workflows: an append-only journal with byte-deterministic replay and crash resume over JSONL or SQLite (multi-process workers with lease fencing), hermetic VCR cassettes gating CI through a frozen 60-cassette defect catalog, hard per-run USD ceilings with orchestrator sub-budgets, finalize reserves and admission control, adaptive orchestration (typed plan revisions with rebase, escalation protocols, model ladders, wake digests, lineage and reuse), ModelKnowledge phases 1 and 2 (the git-reviewed model-suitability claim store with TTL decay, eval-measured claims from matrix sweeps, canary fingerprints, and the one-rung-clamped verified layer), provider adapters for Anthropic, OpenAI-compatible and Google plus a Vercel AI SDK bridge, an eval framework, and the rulvar CLI (run, resume, runs, inspect, plan, kb). Licensed Apache-2.0. The six core SPI seams are frozen; ModelKnowledgeStore freezes with this release per docs/05. Ships the M9 through M11 scope together per the 2026-07-11 amendment to docs/12 section 2.

### Minor Changes

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

## 0.9.0

### Minor Changes

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

## 0.8.0

### Minor Changes

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

## 0.7.0

### Minor Changes

- fd1d06c: M6-T02: WorkerSandboxRunner and the sandbox contract. `@rulvar/planner` gains `WorkerSandboxRunner` (accepts CompiledWorkflow ONLY; worker_threads with the exact curated 12-global scope; timeoutMs 300000 / memoryMb 512 breaches terminate the worker with the new typed `SandboxError`, code `sandbox_limit`). Core gains the public host half, `createSandboxBridge`: proxied primitives (agent, step, workflow, awaitExternal, parallel, pipeline, phase, budget) served against the canonical run ctx with worker thunks executing under host-allocated scope tokens; the worker's SYNC seeded now/random/uuid (and the Date.now/Math.random replacements) mirror-journal as ordinary kind `rand` entries with match-first resume semantics; a busy-state protocol keeps suspension and quiescence behavior identical to in-process runs. `createEngine` gains `runners.sandbox`; `engine.run`/`engine.resume` accept CompiledWorkflow, persist the source blob plus workflowSourceRef/workflowHash at start, and `resume(runId)` with no workflow rehydrates the hash-pinned source (a differing supplied source is a typed ConfigError). New `FileTranscriptStore` makes compiled runs resumable across processes. The sandbox dialect exposes async `budget.spent()/remaining()`; import/fetch/process are absent from the worker scope.
- 6fcf296: M6-T04: profileCard and the API card. Core gains `profileCard(profiles)`: the one agent vocabulary both orchestration modes speak, feeding the planner prompt (mode b) and spawn_agent agentType guidance (mode c) with IDENTICAL text; pure function of the registry, sorted, byte-stable, rendering only model-agnostic fields (name, description, tool names, taskClass, estCost, escalation opt-in; models are never named). The planner gains `apiCard()`: the byte-stable card teaching exactly the curated 12-global sandbox dialect (schema literals only, tools by profile name, onError throw|null, async budget, no imports, the opts.key repeat rule) with usage patterns distilled from the examples corpus.
- dcc97a9: M6-T05: the plan agent and the self-repair loop (mode b). `plan(engine, goal, { model?, profiles?, repairRounds? })` asks a planner model under role `plan` to write a script against the API card plus the engine's profile card, lints it (eslint-plugin-rulvar preset + compileScript), self-repairs up to repairRounds (default 3) from the machine-readable JSON diagnostics, and returns `{ source, workflow, lint }`. The planner conversation is an ordinary journaled run with a goal-derived deterministic runId, so re-planning the same goal replays the unchanged prefix free; exhausting the rounds throws a typed ScriptRejected carrying the last diagnostics. `runPlanned(engine, goal, args?)` composes plan-then-sandbox-run (async by amendment). Core gains `AgentOpts.role` (`'loop' | 'plan' | 'orchestrate'`, the primary invocation role threading through resolution, effort defaults, floors, cost buckets, and events) and the narrow `Engine.profileCard(names?)` accessor rendering the registered profiles through the public API.
- 434dc83: M6-T06: AdmissionController v1 and nested workflows. `ctx.workflow(wf | 'name', args, { key? })` runs a child workflow under the single admission point: a `spawn-admission` decision entry embeds the closed `AdmitVerdict` union (admit | reuse_full | admit_graft | reject with the merged reject-code set; reuse branches produced from M7), the committed reserve, and statsBefore strictly before the two-phase `child` dispatch entry, so replay recovers verdicts and reserves without re-evaluating admission. Enforced: `maxDepth` (default 1, hard ceiling 4), `maxChildrenPerNode` (16), `childBudgetFraction` (0.3 of the parent remainder minus the parent finalize reserve), and the engine lifetime cap. The budget grows into a hierarchical account tree (run root plus one sub-account per child) with spend propagating to every ancestor, per-account layer-2 guards, and per-subtree layer-3 severing. Structural rejections throw the new typed `AdmissionRejectedError` (code `admission_rejected`); budget-class rejections keep `BudgetExhaustedError` semantics. The string form resolves against `defaults.workflows`; `budgetDefaults` gains `childBudgetFraction` and `maxDepth`, and `flatReserveUsd` is now honored. The abandon fold covers child-workflow scopes via the recorded dispatch payload.
- 03173c1: M6-T07 and M6-T08: the mode (c) dynamic orchestrator. `orchestrate(engine, goal, { model?, profiles?, maxSpawns?, budget?, limits? })` and `ctx.orchestrate(goal, opts)` share one implementation: an ordinary workflow whose agent (role `orchestrate`) holds the typed toolset with the normative docs/07 schemas: `spawn_agent`, `parallel_agents`, `await_any`, `await_all`, `cancel_agent`, and the loop-terminal `finish` (a new engine interception alongside escalate). Every spawn is an ordinary kind `agent` entry under the orchestrator's `agent:<seq>` scope, admitted through the single AdmissionController with the verdict, evaluated reserve, and statsBefore embedded in a `spawn-admission` decision entry (the budget debit itself rides the child's dispatch: one debit, never two); rejections surface as typed tool errors and never kill the run. Handles ARE the child dispatch seqs and stay stable across resume: a crashed orchestrator restores its transcript from the mandatory turn-boundary checkpoint, rebuilds its spawn records from the journal, redispatches only what was in flight, and finds settled children by content keys with zero re-paid spawns and no duplicate spawn decisions. `await_any`/`await_all` deliver deterministic TaskDigests; `cancel_agent` aborts an in-flight child to a `cancelled` terminal (caller intent; abandon coverage arrives with M7 cancel_task). The nested surface rides ctx.workflow, so maxDepth and the budget account tree clamp it for free; the orchestrator gets its own budget sub-account when a cap resolves (reserve decisions and the at-cap freeze are M7, DEF-7).
- 11c0afc: M6-T09 and M6-T10: wait_for_events, the WakeDigest substrate, and ctx.brief. `wait_for_events` (the normative docs/07 4.8 schema) parks the orchestrator on an ordinary DEF-4 suspension; the closed v1 trigger vocabulary is quiescence (always armed), child_terminal, escalation, and budget_threshold at the fixed 50/80 percents; a REQUESTED trigger set that can never fire (no run ceiling, unknown or fully delivered handles, no live children) is an immediate typed tool error, so an embedded run cannot hang unrecoverably. The wake is the closing resolution whose value IS the coalesced `WakeDigest` (substrate fields: digestSeq, coversToOrdinal, completedDigests ordered by spawn ordinal, escalations with reportRef): a re-executed post-crash turn reads exactly the same digest bytes, replay never rebuilds a digest, and simultaneous ready triggers journal one applied resolution plus noop losers under first-closing-wins. Trigger evaluation runs at arm time and on every child settlement; the orchestrator sleeps between wakes and its context grows O(wakes). `ctx.brief({ content, instruction?, model?, agentType? })` is a journaled summarize-role invocation (one agent-kind entry, free on replay) for handing an inheritable brief to a child.

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

### Patch Changes

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
  approval:<seq> key; RunHandle.resolveExternal validates
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

## 0.2.0

### Minor Changes

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
  AgentError value projection); SchemaSpec in its three forms with Out<S>
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
