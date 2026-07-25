[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightReport

# Interface: PreflightReport

Defined in: [packages/core/src/engine/preflight.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L232)

The machine-readable preflight report; JSON-serializable throughout.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admission"></a> `admission` | \{ `admitted`: `number`; `ceilingUsd?`: `number`; `denied`: `number`; `reservedForFinalizationUsd`: `number`; `wave`: [`PreflightAdmissionRow`](/api/@rulvar/core/interfaces/PreflightAdmissionRow.md)[]; \} | - | [packages/core/src/engine/preflight.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L255) |
| `admission.admitted` | `number` | - | [packages/core/src/engine/preflight.ts:259](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L259) |
| `admission.ceilingUsd?` | `number` | - | [packages/core/src/engine/preflight.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L256) |
| `admission.denied` | `number` | - | [packages/core/src/engine/preflight.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L260) |
| `admission.reservedForFinalizationUsd` | `number` | - | [packages/core/src/engine/preflight.ts:257](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L257) |
| `admission.wave` | [`PreflightAdmissionRow`](/api/@rulvar/core/interfaces/PreflightAdmissionRow.md)[] | - | [packages/core/src/engine/preflight.ts:258](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L258) |
| <a id="property-budget"></a> `budget` | \{ `ceilingUsd?`: `number`; `childBudgetFraction`: `number`; `flatReserveUsd`: `number`; `lifetimeSpawnCap`: `number`; `maxDepth`: `number`; `orchestrator?`: \{ `effectiveCapUsd?`: `number`; `finalizeReserveUsd`: `number`; `finalizeTurns`: `number`; `projectedProviderTurns`: `number`; `reserveCommitted`: `boolean`; \}; \} | - | [packages/core/src/engine/preflight.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L234) |
| `budget.ceilingUsd?` | `number` | - | [packages/core/src/engine/preflight.ts:235](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L235) |
| `budget.childBudgetFraction` | `number` | - | [packages/core/src/engine/preflight.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L238) |
| `budget.flatReserveUsd` | `number` | - | [packages/core/src/engine/preflight.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L236) |
| `budget.lifetimeSpawnCap` | `number` | - | [packages/core/src/engine/preflight.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L237) |
| `budget.maxDepth` | `number` | - | [packages/core/src/engine/preflight.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L239) |
| `budget.orchestrator?` | \{ `effectiveCapUsd?`: `number`; `finalizeReserveUsd`: `number`; `finalizeTurns`: `number`; `projectedProviderTurns`: `number`; `reserveCommitted`: `boolean`; \} | - | [packages/core/src/engine/preflight.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L240) |
| `budget.orchestrator.effectiveCapUsd?` | `number` | min(capUsd, (capFraction ?? 0.2) x ceiling); absent when unresolvable. | [packages/core/src/engine/preflight.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L242) |
| `budget.orchestrator.finalizeReserveUsd` | `number` | - | [packages/core/src/engine/preflight.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L243) |
| `budget.orchestrator.finalizeTurns` | `number` | - | [packages/core/src/engine/preflight.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L244) |
| `budget.orchestrator.projectedProviderTurns` | `number` | The orchestrator agent's own loop ceiling, derived exactly like a spawn's. | [packages/core/src/engine/preflight.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L248) |
| `budget.orchestrator.reserveCommitted` | `boolean` | Whether the finalize reserve is committed against the run root (extension runs). | [packages/core/src/engine/preflight.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L246) |
| <a id="property-concurrency"></a> `concurrency` | \{ `perProvider?`: `Record`\&lt;`string`, `number`\&gt;; `perRun`: `number`; \} | - | [packages/core/src/engine/preflight.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L233) |
| `concurrency.perProvider?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/preflight.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L233) |
| `concurrency.perRun` | `number` | - | [packages/core/src/engine/preflight.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L233) |
| <a id="property-exposure"></a> `exposure` | \{ `maxInFlight`: `number`; `overshootOneTurnFloorUsd?`: `number`; `perProvider`: `Record`\&lt;`string`, \{ `inFlight`: `number`; `requestsPerWave`: `number`; `tokensPerWaveFloor`: `number`; \}\&gt;; `runCeiling?`: \{ `requests`: `number`; `tokens`: `number`; \}; \} | - | [packages/core/src/engine/preflight.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L262) |
| `exposure.maxInFlight` | `number` | Concurrent in-flight turns the declared wave can hold. | [packages/core/src/engine/preflight.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L264) |
| `exposure.overshootOneTurnFloorUsd?` | `number` | The one-more-turn cost floor past a ceiling crossing: the sum of the maxInFlight most expensive declared turn floors. The documented overshoot bound is one turn per in-flight agent; real turns grow with the prompt, so this is the floor of that bound. | [packages/core/src/engine/preflight.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L271) |
| `exposure.perProvider` | `Record`\&lt;`string`, \{ `inFlight`: `number`; `requestsPerWave`: `number`; `tokensPerWaveFloor`: `number`; \}\&gt; | Per-provider first-wave demand at the declared estimates. | [packages/core/src/engine/preflight.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L273) |
| `exposure.runCeiling?` | \{ `requests`: `number`; `tokens`: `number`; \} | The declared wave run to its derived turn ceilings, at the declared estimates (the second experiment report, rec 9): total provider calls (fan-out times per-spawn projected turns, before any retries) and the cumulative token demand with the context regrowing every turn (turn k re-sends the declared prompt plus the k-1 prior output bounds, so K turns cost K x est + outputBound x K(K+1)/2). Absent when nothing is declared. | [packages/core/src/engine/preflight.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L286) |
| `exposure.runCeiling.requests` | `number` | - | [packages/core/src/engine/preflight.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L286) |
| `exposure.runCeiling.tokens` | `number` | - | [packages/core/src/engine/preflight.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L286) |
| <a id="property-findings"></a> `findings` | [`PreflightFinding`](/api/@rulvar/core/interfaces/PreflightFinding.md)[] | - | [packages/core/src/engine/preflight.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L300) |
| <a id="property-finishvalidation"></a> `finishValidation?` | \{ `contractHash?`: `string`; `selfTest`: `"passed"` \| `"failed"` \| `"skipped"`; `validators`: `string`[]; \} | Present when input.finishValidation was provided: the self test echo. `selfTest` reflects the golden fixture run alone ('skipped' = no fixture resolvable); containment drift between a contract and the validator set reports through findings either way. | [packages/core/src/engine/preflight.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L295) |
| `finishValidation.contractHash?` | `string` | - | [packages/core/src/engine/preflight.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L296) |
| `finishValidation.selfTest` | `"passed"` \| `"failed"` \| `"skipped"` | - | [packages/core/src/engine/preflight.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L298) |
| `finishValidation.validators` | `string`[] | - | [packages/core/src/engine/preflight.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L297) |
| <a id="property-quota"></a> `quota` | \{ `configured`: `boolean`; `rules?`: `number`; `tenant?`: `string`; \} | - | [packages/core/src/engine/preflight.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L251) |
| `quota.configured` | `boolean` | - | [packages/core/src/engine/preflight.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L251) |
| `quota.rules?` | `number` | - | [packages/core/src/engine/preflight.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L251) |
| `quota.tenant?` | `string` | - | [packages/core/src/engine/preflight.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L251) |
| <a id="property-runlimits"></a> `runLimits` | [`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | The run-level merge an undeclared spawn would receive. | [packages/core/src/engine/preflight.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L253) |
| <a id="property-spawns"></a> `spawns` | [`PreflightSpawnReport`](/api/@rulvar/core/interfaces/PreflightSpawnReport.md)[] | - | [packages/core/src/engine/preflight.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L254) |
