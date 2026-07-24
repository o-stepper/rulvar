[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightReport

# Interface: PreflightReport

Defined in: [packages/core/src/engine/preflight.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L171)

The machine-readable preflight report; JSON-serializable throughout.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admission"></a> `admission` | \{ `admitted`: `number`; `ceilingUsd?`: `number`; `denied`: `number`; `reservedForFinalizationUsd`: `number`; `wave`: [`PreflightAdmissionRow`](/api/@rulvar/core/interfaces/PreflightAdmissionRow.md)[]; \} | - | [packages/core/src/engine/preflight.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L192) |
| `admission.admitted` | `number` | - | [packages/core/src/engine/preflight.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L196) |
| `admission.ceilingUsd?` | `number` | - | [packages/core/src/engine/preflight.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L193) |
| `admission.denied` | `number` | - | [packages/core/src/engine/preflight.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L197) |
| `admission.reservedForFinalizationUsd` | `number` | - | [packages/core/src/engine/preflight.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L194) |
| `admission.wave` | [`PreflightAdmissionRow`](/api/@rulvar/core/interfaces/PreflightAdmissionRow.md)[] | - | [packages/core/src/engine/preflight.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L195) |
| <a id="property-budget"></a> `budget` | \{ `ceilingUsd?`: `number`; `childBudgetFraction`: `number`; `flatReserveUsd`: `number`; `lifetimeSpawnCap`: `number`; `maxDepth`: `number`; `orchestrator?`: \{ `effectiveCapUsd?`: `number`; `finalizeReserveUsd`: `number`; `finalizeTurns`: `number`; `reserveCommitted`: `boolean`; \}; \} | - | [packages/core/src/engine/preflight.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L173) |
| `budget.ceilingUsd?` | `number` | - | [packages/core/src/engine/preflight.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L174) |
| `budget.childBudgetFraction` | `number` | - | [packages/core/src/engine/preflight.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L177) |
| `budget.flatReserveUsd` | `number` | - | [packages/core/src/engine/preflight.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L175) |
| `budget.lifetimeSpawnCap` | `number` | - | [packages/core/src/engine/preflight.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L176) |
| `budget.maxDepth` | `number` | - | [packages/core/src/engine/preflight.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L178) |
| `budget.orchestrator?` | \{ `effectiveCapUsd?`: `number`; `finalizeReserveUsd`: `number`; `finalizeTurns`: `number`; `reserveCommitted`: `boolean`; \} | - | [packages/core/src/engine/preflight.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L179) |
| `budget.orchestrator.effectiveCapUsd?` | `number` | min(capUsd, (capFraction ?? 0.2) x ceiling); absent when unresolvable. | [packages/core/src/engine/preflight.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L181) |
| `budget.orchestrator.finalizeReserveUsd` | `number` | - | [packages/core/src/engine/preflight.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L182) |
| `budget.orchestrator.finalizeTurns` | `number` | - | [packages/core/src/engine/preflight.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L183) |
| `budget.orchestrator.reserveCommitted` | `boolean` | Whether the finalize reserve is committed against the run root (extension runs). | [packages/core/src/engine/preflight.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L185) |
| <a id="property-concurrency"></a> `concurrency` | \{ `perProvider?`: `Record`\&lt;`string`, `number`\&gt;; `perRun`: `number`; \} | - | [packages/core/src/engine/preflight.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L172) |
| `concurrency.perProvider?` | `Record`\&lt;`string`, `number`\&gt; | - | [packages/core/src/engine/preflight.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L172) |
| `concurrency.perRun` | `number` | - | [packages/core/src/engine/preflight.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L172) |
| <a id="property-exposure"></a> `exposure` | \{ `maxInFlight`: `number`; `overshootOneTurnFloorUsd?`: `number`; `perProvider`: `Record`\&lt;`string`, \{ `inFlight`: `number`; `requestsPerWave`: `number`; `tokensPerWaveFloor`: `number`; \}\&gt;; \} | - | [packages/core/src/engine/preflight.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L199) |
| `exposure.maxInFlight` | `number` | Concurrent in-flight turns the declared wave can hold. | [packages/core/src/engine/preflight.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L201) |
| `exposure.overshootOneTurnFloorUsd?` | `number` | The one-more-turn cost floor past a ceiling crossing: the sum of the maxInFlight most expensive declared turn floors. The documented overshoot bound is one turn per in-flight agent; real turns grow with the prompt, so this is the floor of that bound. | [packages/core/src/engine/preflight.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L208) |
| `exposure.perProvider` | `Record`\&lt;`string`, \{ `inFlight`: `number`; `requestsPerWave`: `number`; `tokensPerWaveFloor`: `number`; \}\&gt; | Per-provider first-wave demand at the declared estimates. | [packages/core/src/engine/preflight.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L210) |
| <a id="property-findings"></a> `findings` | [`PreflightFinding`](/api/@rulvar/core/interfaces/PreflightFinding.md)[] | - | [packages/core/src/engine/preflight.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L215) |
| <a id="property-quota"></a> `quota` | \{ `configured`: `boolean`; `rules?`: `number`; `tenant?`: `string`; \} | - | [packages/core/src/engine/preflight.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L188) |
| `quota.configured` | `boolean` | - | [packages/core/src/engine/preflight.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L188) |
| `quota.rules?` | `number` | - | [packages/core/src/engine/preflight.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L188) |
| `quota.tenant?` | `string` | - | [packages/core/src/engine/preflight.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L188) |
| <a id="property-runlimits"></a> `runLimits` | [`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | The run-level merge an undeclared spawn would receive. | [packages/core/src/engine/preflight.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L190) |
| <a id="property-spawns"></a> `spawns` | [`PreflightSpawnReport`](/api/@rulvar/core/interfaces/PreflightSpawnReport.md)[] | - | [packages/core/src/engine/preflight.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L191) |
