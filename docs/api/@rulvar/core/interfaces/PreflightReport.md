[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightReport

# Interface: PreflightReport

Defined in: [packages/core/src/engine/preflight.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L202)

The machine-readable preflight report; JSON-serializable throughout.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admission"></a> `admission` | \{ `admitted`: `number`; `ceilingUsd?`: `number`; `denied`: `number`; `reservedForFinalizationUsd`: `number`; `wave`: [`PreflightAdmissionRow`](/api/@rulvar/core/interfaces/PreflightAdmissionRow.md)[]; \} | - | [packages/core/src/engine/preflight.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L223) |
| `admission.admitted` | `number` | - | [packages/core/src/engine/preflight.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L227) |
| `admission.ceilingUsd?` | `number` | - | [packages/core/src/engine/preflight.ts:224](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L224) |
| `admission.denied` | `number` | - | [packages/core/src/engine/preflight.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L228) |
| `admission.reservedForFinalizationUsd` | `number` | - | [packages/core/src/engine/preflight.ts:225](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L225) |
| `admission.wave` | [`PreflightAdmissionRow`](/api/@rulvar/core/interfaces/PreflightAdmissionRow.md)[] | - | [packages/core/src/engine/preflight.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L226) |
| <a id="property-budget"></a> `budget` | \{ `ceilingUsd?`: `number`; `childBudgetFraction`: `number`; `flatReserveUsd`: `number`; `lifetimeSpawnCap`: `number`; `maxDepth`: `number`; `orchestrator?`: \{ `effectiveCapUsd?`: `number`; `finalizeReserveUsd`: `number`; `finalizeTurns`: `number`; `reserveCommitted`: `boolean`; \}; \} | - | [packages/core/src/engine/preflight.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L204) |
| `budget.ceilingUsd?` | `number` | - | [packages/core/src/engine/preflight.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L205) |
| `budget.childBudgetFraction` | `number` | - | [packages/core/src/engine/preflight.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L208) |
| `budget.flatReserveUsd` | `number` | - | [packages/core/src/engine/preflight.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L206) |
| `budget.lifetimeSpawnCap` | `number` | - | [packages/core/src/engine/preflight.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L207) |
| `budget.maxDepth` | `number` | - | [packages/core/src/engine/preflight.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L209) |
| `budget.orchestrator?` | \{ `effectiveCapUsd?`: `number`; `finalizeReserveUsd`: `number`; `finalizeTurns`: `number`; `reserveCommitted`: `boolean`; \} | - | [packages/core/src/engine/preflight.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L210) |
| `budget.orchestrator.effectiveCapUsd?` | `number` | min(capUsd, (capFraction ?? 0.2) x ceiling); absent when unresolvable. | [packages/core/src/engine/preflight.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L212) |
| `budget.orchestrator.finalizeReserveUsd` | `number` | - | [packages/core/src/engine/preflight.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L213) |
| `budget.orchestrator.finalizeTurns` | `number` | - | [packages/core/src/engine/preflight.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L214) |
| `budget.orchestrator.reserveCommitted` | `boolean` | Whether the finalize reserve is committed against the run root (extension runs). | [packages/core/src/engine/preflight.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L216) |
| <a id="property-concurrency"></a> `concurrency` | \{ `perProvider?`: `Record`\&lt;`string`, `number`\&gt;; `perRun`: `number`; \} | - | [packages/core/src/engine/preflight.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L203) |
| `concurrency.perProvider?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/preflight.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L203) |
| `concurrency.perRun` | `number` | - | [packages/core/src/engine/preflight.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L203) |
| <a id="property-exposure"></a> `exposure` | \{ `maxInFlight`: `number`; `overshootOneTurnFloorUsd?`: `number`; `perProvider`: `Record`\&lt;`string`, \{ `inFlight`: `number`; `requestsPerWave`: `number`; `tokensPerWaveFloor`: `number`; \}\&gt;; \} | - | [packages/core/src/engine/preflight.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L230) |
| `exposure.maxInFlight` | `number` | Concurrent in-flight turns the declared wave can hold. | [packages/core/src/engine/preflight.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L232) |
| `exposure.overshootOneTurnFloorUsd?` | `number` | The one-more-turn cost floor past a ceiling crossing: the sum of the maxInFlight most expensive declared turn floors. The documented overshoot bound is one turn per in-flight agent; real turns grow with the prompt, so this is the floor of that bound. | [packages/core/src/engine/preflight.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L239) |
| `exposure.perProvider` | `Record`\&lt;`string`, \{ `inFlight`: `number`; `requestsPerWave`: `number`; `tokensPerWaveFloor`: `number`; \}\&gt; | Per-provider first-wave demand at the declared estimates. | [packages/core/src/engine/preflight.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L241) |
| <a id="property-findings"></a> `findings` | [`PreflightFinding`](/api/@rulvar/core/interfaces/PreflightFinding.md)[] | - | [packages/core/src/engine/preflight.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L246) |
| <a id="property-quota"></a> `quota` | \{ `configured`: `boolean`; `rules?`: `number`; `tenant?`: `string`; \} | - | [packages/core/src/engine/preflight.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L219) |
| `quota.configured` | `boolean` | - | [packages/core/src/engine/preflight.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L219) |
| `quota.rules?` | `number` | - | [packages/core/src/engine/preflight.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L219) |
| `quota.tenant?` | `string` | - | [packages/core/src/engine/preflight.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L219) |
| <a id="property-runlimits"></a> `runLimits` | [`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | The run-level merge an undeclared spawn would receive. | [packages/core/src/engine/preflight.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L221) |
| <a id="property-spawns"></a> `spawns` | [`PreflightSpawnReport`](/api/@rulvar/core/interfaces/PreflightSpawnReport.md)[] | - | [packages/core/src/engine/preflight.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L222) |
