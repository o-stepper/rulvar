[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightReport

# Interface: PreflightReport

Defined in: [packages/core/src/engine/preflight.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L211)

The machine-readable preflight report; JSON-serializable throughout.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admission"></a> `admission` | \{ `admitted`: `number`; `ceilingUsd?`: `number`; `denied`: `number`; `reservedForFinalizationUsd`: `number`; `wave`: [`PreflightAdmissionRow`](/api/@rulvar/core/interfaces/PreflightAdmissionRow.md)[]; \} | - | [packages/core/src/engine/preflight.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L234) |
| `admission.admitted` | `number` | - | [packages/core/src/engine/preflight.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L238) |
| `admission.ceilingUsd?` | `number` | - | [packages/core/src/engine/preflight.ts:235](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L235) |
| `admission.denied` | `number` | - | [packages/core/src/engine/preflight.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L239) |
| `admission.reservedForFinalizationUsd` | `number` | - | [packages/core/src/engine/preflight.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L236) |
| `admission.wave` | [`PreflightAdmissionRow`](/api/@rulvar/core/interfaces/PreflightAdmissionRow.md)[] | - | [packages/core/src/engine/preflight.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L237) |
| <a id="property-budget"></a> `budget` | \{ `ceilingUsd?`: `number`; `childBudgetFraction`: `number`; `flatReserveUsd`: `number`; `lifetimeSpawnCap`: `number`; `maxDepth`: `number`; `orchestrator?`: \{ `effectiveCapUsd?`: `number`; `finalizeReserveUsd`: `number`; `finalizeTurns`: `number`; `projectedProviderTurns`: `number`; `reserveCommitted`: `boolean`; \}; \} | - | [packages/core/src/engine/preflight.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L213) |
| `budget.ceilingUsd?` | `number` | - | [packages/core/src/engine/preflight.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L214) |
| `budget.childBudgetFraction` | `number` | - | [packages/core/src/engine/preflight.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L217) |
| `budget.flatReserveUsd` | `number` | - | [packages/core/src/engine/preflight.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L215) |
| `budget.lifetimeSpawnCap` | `number` | - | [packages/core/src/engine/preflight.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L216) |
| `budget.maxDepth` | `number` | - | [packages/core/src/engine/preflight.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L218) |
| `budget.orchestrator?` | \{ `effectiveCapUsd?`: `number`; `finalizeReserveUsd`: `number`; `finalizeTurns`: `number`; `projectedProviderTurns`: `number`; `reserveCommitted`: `boolean`; \} | - | [packages/core/src/engine/preflight.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L219) |
| `budget.orchestrator.effectiveCapUsd?` | `number` | min(capUsd, (capFraction ?? 0.2) x ceiling); absent when unresolvable. | [packages/core/src/engine/preflight.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L221) |
| `budget.orchestrator.finalizeReserveUsd` | `number` | - | [packages/core/src/engine/preflight.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L222) |
| `budget.orchestrator.finalizeTurns` | `number` | - | [packages/core/src/engine/preflight.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L223) |
| `budget.orchestrator.projectedProviderTurns` | `number` | The orchestrator agent's own loop ceiling, derived exactly like a spawn's. | [packages/core/src/engine/preflight.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L227) |
| `budget.orchestrator.reserveCommitted` | `boolean` | Whether the finalize reserve is committed against the run root (extension runs). | [packages/core/src/engine/preflight.ts:225](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L225) |
| <a id="property-concurrency"></a> `concurrency` | \{ `perProvider?`: `Record`\&lt;`string`, `number`\&gt;; `perRun`: `number`; \} | - | [packages/core/src/engine/preflight.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L212) |
| `concurrency.perProvider?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/preflight.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L212) |
| `concurrency.perRun` | `number` | - | [packages/core/src/engine/preflight.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L212) |
| <a id="property-exposure"></a> `exposure` | \{ `maxInFlight`: `number`; `overshootOneTurnFloorUsd?`: `number`; `perProvider`: `Record`\&lt;`string`, \{ `inFlight`: `number`; `requestsPerWave`: `number`; `tokensPerWaveFloor`: `number`; \}\&gt;; `runCeiling?`: \{ `requests`: `number`; `tokens`: `number`; \}; \} | - | [packages/core/src/engine/preflight.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L241) |
| `exposure.maxInFlight` | `number` | Concurrent in-flight turns the declared wave can hold. | [packages/core/src/engine/preflight.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L243) |
| `exposure.overshootOneTurnFloorUsd?` | `number` | The one-more-turn cost floor past a ceiling crossing: the sum of the maxInFlight most expensive declared turn floors. The documented overshoot bound is one turn per in-flight agent; real turns grow with the prompt, so this is the floor of that bound. | [packages/core/src/engine/preflight.ts:250](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L250) |
| `exposure.perProvider` | `Record`\&lt;`string`, \{ `inFlight`: `number`; `requestsPerWave`: `number`; `tokensPerWaveFloor`: `number`; \}\&gt; | Per-provider first-wave demand at the declared estimates. | [packages/core/src/engine/preflight.ts:252](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L252) |
| `exposure.runCeiling?` | \{ `requests`: `number`; `tokens`: `number`; \} | The declared wave run to its derived turn ceilings, at the declared estimates (the second experiment report, rec 9): total provider calls (fan-out times per-spawn projected turns, before any retries) and the cumulative token demand with the context regrowing every turn (turn k re-sends the declared prompt plus the k-1 prior output bounds, so K turns cost K x est + outputBound x K(K+1)/2). Absent when nothing is declared. | [packages/core/src/engine/preflight.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L265) |
| `exposure.runCeiling.requests` | `number` | - | [packages/core/src/engine/preflight.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L265) |
| `exposure.runCeiling.tokens` | `number` | - | [packages/core/src/engine/preflight.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L265) |
| <a id="property-findings"></a> `findings` | [`PreflightFinding`](/api/@rulvar/core/interfaces/PreflightFinding.md)[] | - | [packages/core/src/engine/preflight.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L267) |
| <a id="property-quota"></a> `quota` | \{ `configured`: `boolean`; `rules?`: `number`; `tenant?`: `string`; \} | - | [packages/core/src/engine/preflight.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L230) |
| `quota.configured` | `boolean` | - | [packages/core/src/engine/preflight.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L230) |
| `quota.rules?` | `number` | - | [packages/core/src/engine/preflight.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L230) |
| `quota.tenant?` | `string` | - | [packages/core/src/engine/preflight.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L230) |
| <a id="property-runlimits"></a> `runLimits` | [`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | The run-level merge an undeclared spawn would receive. | [packages/core/src/engine/preflight.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L232) |
| <a id="property-spawns"></a> `spawns` | [`PreflightSpawnReport`](/api/@rulvar/core/interfaces/PreflightSpawnReport.md)[] | - | [packages/core/src/engine/preflight.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L233) |
