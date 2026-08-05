[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PreflightReport

# Interface: PreflightReport

Defined in: `packages/core/dist/index.d.ts`

The machine-readable preflight report; JSON-serializable throughout.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admission"></a> `admission` | \{ `admitted`: `number`; `ceilingUsd?`: `number`; `denied`: `number`; `reservedForFinalizationUsd`: `number`; `synthesisReserveUsd`: `number`; `wave`: [`PreflightAdmissionRow`](/api/@rulvar/rulvar/interfaces/PreflightAdmissionRow.md)[]; \} | - | `packages/core/dist/index.d.ts` |
| `admission.admitted` | `number` | - | `packages/core/dist/index.d.ts` |
| `admission.ceilingUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| `admission.denied` | `number` | - | `packages/core/dist/index.d.ts` |
| `admission.reservedForFinalizationUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `admission.synthesisReserveUsd` | `number` | The synthesis payload carve-out the projection holds against the run root, exactly the live commitSynthesisReserve mirror (RV1901): a capped orchestrator with budget.synthesisReserveUsd registers it on the root before any spawn admits, so the wave arithmetic must hold it too. Zero when the orchestrator is uncapped or declares no synthesis reserve, matching the runtime that then commits none. | `packages/core/dist/index.d.ts` |
| `admission.wave` | [`PreflightAdmissionRow`](/api/@rulvar/rulvar/interfaces/PreflightAdmissionRow.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-budget"></a> `budget` | \{ `ceilingUsd?`: `number`; `childBudgetFraction`: `number`; `flatReserveUsd`: `number`; `lifetimeSpawnCap`: `number`; `maxDepth`: `number`; `orchestrator?`: \{ `effectiveCapUsd?`: `number`; `finalizeReserveUsd`: `number`; `finalizeTurns`: `number`; `projectedProviderTurns`: `number`; `reserveCommitted`: `boolean`; `synthesis?`: \{ `projectedProviderTurns`: `number`; `servedBy?`: `` `${string}:${string}` ``; \}; \}; \} | - | `packages/core/dist/index.d.ts` |
| `budget.ceilingUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| `budget.childBudgetFraction` | `number` | - | `packages/core/dist/index.d.ts` |
| `budget.flatReserveUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `budget.lifetimeSpawnCap` | `number` | - | `packages/core/dist/index.d.ts` |
| `budget.maxDepth` | `number` | - | `packages/core/dist/index.d.ts` |
| `budget.orchestrator?` | \{ `effectiveCapUsd?`: `number`; `finalizeReserveUsd`: `number`; `finalizeTurns`: `number`; `projectedProviderTurns`: `number`; `reserveCommitted`: `boolean`; `synthesis?`: \{ `projectedProviderTurns`: `number`; `servedBy?`: `` `${string}:${string}` ``; \}; \} | - | `packages/core/dist/index.d.ts` |
| `budget.orchestrator.effectiveCapUsd?` | `number` | min(capUsd, (capFraction ?? 0.2) x ceiling); absent when unresolvable. | `packages/core/dist/index.d.ts` |
| `budget.orchestrator.finalizeReserveUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `budget.orchestrator.finalizeTurns` | `number` | - | `packages/core/dist/index.d.ts` |
| `budget.orchestrator.projectedProviderTurns` | `number` | - | `packages/core/dist/index.d.ts` |
| `budget.orchestrator.reserveCommitted` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `budget.orchestrator.synthesis?` | \{ `projectedProviderTurns`: `number`; `servedBy?`: `` `${string}:${string}` ``; \} | The separate synthesis invocation's projection, present when input.orchestrator.synthesis was declared and the role resolves: its turn ceiling (the repair turn reserve folded in when declared) and its serving model. | `packages/core/dist/index.d.ts` |
| `budget.orchestrator.synthesis.projectedProviderTurns` | `number` | - | `packages/core/dist/index.d.ts` |
| `budget.orchestrator.synthesis.servedBy?` | `` `${string}:${string}` `` | - | `packages/core/dist/index.d.ts` |
| <a id="property-concurrency"></a> `concurrency` | \{ `perProvider?`: `Record`\&lt;`string`, `number`\&gt;; `perRun`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `concurrency.perProvider?` | `Record`\&lt;`string`, `number`\&gt; | - | `packages/core/dist/index.d.ts` |
| `concurrency.perRun` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-exposure"></a> `exposure` | \{ `maxInFlight`: `number`; `overshootOneTurnFloorUsd?`: `number`; `perProvider`: `Record`\&lt;`string`, \{ `inFlight`: `number`; `requestsPerWave`: `number`; `tokensPerWaveFloor`: `number`; \}\&gt;; `runCeiling?`: \{ `requests`: `number`; `tokens`: `number`; \}; \} | - | `packages/core/dist/index.d.ts` |
| `exposure.maxInFlight` | `number` | Concurrent in-flight turns the declared wave can hold. | `packages/core/dist/index.d.ts` |
| `exposure.overshootOneTurnFloorUsd?` | `number` | The one-more-turn cost floor past a ceiling crossing: the sum of the maxInFlight most expensive declared turn floors. The documented overshoot bound is one turn per in-flight agent; real turns grow with the prompt, so this is the floor of that bound. | `packages/core/dist/index.d.ts` |
| `exposure.perProvider` | `Record`\&lt;`string`, \{ `inFlight`: `number`; `requestsPerWave`: `number`; `tokensPerWaveFloor`: `number`; \}\&gt; | - | `packages/core/dist/index.d.ts` |
| `exposure.runCeiling?` | \{ `requests`: `number`; `tokens`: `number`; \} | The declared wave run to its derived turn ceilings, at the declared estimates (the second experiment report, rec 9): total provider calls (fan-out times per-spawn projected turns, before any retries) and the cumulative token demand with the context regrowing every turn (turn k re-sends the declared prompt plus the k-1 prior output bounds, so K turns cost K x est + outputBound x K(K+1)/2). Absent when nothing is declared. | `packages/core/dist/index.d.ts` |
| `exposure.runCeiling.requests` | `number` | - | `packages/core/dist/index.d.ts` |
| `exposure.runCeiling.tokens` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-findings"></a> `findings` | [`PreflightFinding`](/api/@rulvar/rulvar/interfaces/PreflightFinding.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-finishvalidation"></a> `finishValidation?` | \{ `contractHash?`: `string`; `selfTest`: `"failed"` \| `"skipped"` \| `"passed"`; `validators`: `string`[]; \} | Present when input.finishValidation was provided: the self test echo. `selfTest` reflects the golden fixture run alone ('skipped' = no fixture resolvable); containment drift between a contract and the validator set reports through findings either way. | `packages/core/dist/index.d.ts` |
| `finishValidation.contractHash?` | `string` | - | `packages/core/dist/index.d.ts` |
| `finishValidation.selfTest` | `"failed"` \| `"skipped"` \| `"passed"` | - | `packages/core/dist/index.d.ts` |
| `finishValidation.validators` | `string`[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-quota"></a> `quota` | \{ `configured`: `boolean`; `rules?`: `number`; `tenant?`: `string`; \} | - | `packages/core/dist/index.d.ts` |
| `quota.configured` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `quota.rules?` | `number` | - | `packages/core/dist/index.d.ts` |
| `quota.tenant?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-runlimits"></a> `runLimits` | [`EffectiveUsageLimits`](/api/@rulvar/rulvar/interfaces/EffectiveUsageLimits.md) | The run-level merge an undeclared spawn would receive. | `packages/core/dist/index.d.ts` |
| <a id="property-spawns"></a> `spawns` | [`PreflightSpawnReport`](/api/@rulvar/rulvar/interfaces/PreflightSpawnReport.md)[] | - | `packages/core/dist/index.d.ts` |
