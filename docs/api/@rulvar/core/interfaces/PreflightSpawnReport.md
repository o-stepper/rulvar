[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightSpawnReport

# Interface: PreflightSpawnReport

Defined in: [packages/core/src/engine/preflight.ts:404](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L404)

The effective picture of one declared spawn shape.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissionreserveusd"></a> `admissionReserveUsd` | `number` | The layer-1 admission reserve this spawn would be admitted under. | [packages/core/src/engine/preflight.ts:422](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L422) |
| <a id="property-cachedloopinputfloorusd"></a> `cachedLoopInputFloorUsd?` | `number` | The same loop under the RV2006 cache policy: one cache write of the prompt floor plus a cache read on every later turn, priced by the row's cache rates. Present beside the uncached figure when the row carries cache rates. The parity worker shape (36k-token prompt floor, a long cycle) prices the difference at roughly three to four times, the gap between four seats fitting a $6 envelope and three seats dying against it. | [packages/core/src/engine/preflight.ts:451](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L451) |
| <a id="property-count"></a> `count` | `number` | - | [packages/core/src/engine/preflight.ts:407](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L407) |
| <a id="property-executedtoolcallceiling"></a> `executedToolCallCeiling` | `number` \| `null` | Executed-call ceiling across any tool mix; null = unlimited. | [packages/core/src/engine/preflight.ts:453](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L453) |
| <a id="property-label"></a> `label` | `string` | - | [packages/core/src/engine/preflight.ts:405](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L405) |
| <a id="property-limits"></a> `limits` | [`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | The SAME merge the runtime applies: call over profile over engine defaults. | [packages/core/src/engine/preflight.ts:420](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L420) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | The per-turn output bound: caps.maxOutputTokens clamped by the limits field. | [packages/core/src/engine/preflight.ts:427](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L427) |
| <a id="property-projectedproviderturns"></a> `projectedProviderTurns` | `number` | The provider-call ceiling of ONE spawn's whole loop: maxTurns bounded by the executed-call ceiling plus its final no-tool turn, plus the finalization summary turn when a tool budget limiter arms it. Every provider turn is one wire request and one quota reservation, so this is the per-spawn multiplier of quota demand; retries sit on top of it. | [packages/core/src/engine/preflight.ts:462](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L462) |
| <a id="property-ratesverifiedat"></a> `ratesVerifiedAt?` | `string` | The serving row's last rates verification date (RV814), copied from the resolved pricing; absent when the row names none. Every dollar in this report is priced under that row, so its staleness is part of the projection's honesty. | [packages/core/src/engine/preflight.ts:418](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L418) |
| <a id="property-reservesource"></a> `reserveSource` | \| `"estCost"` \| `"profile-estCost"` \| `"priced-estimate"` \| `"flat-default"` \| `"unpriced-zero"` | Which arm of the reserve formula produced the number. | [packages/core/src/engine/preflight.ts:424](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L424) |
| <a id="property-role"></a> `role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/engine/preflight.ts:406](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L406) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | The resolved serving target; absent when no model resolves (see findings). | [packages/core/src/engine/preflight.ts:409](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L409) |
| <a id="property-toolceilings"></a> `toolCeilings` | [`PreflightToolCeiling`](/api/@rulvar/core/interfaces/PreflightToolCeiling.md)[] | Per-tool ceilings for every tool a cap or a unit cost names. | [packages/core/src/engine/preflight.ts:464](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L464) |
| <a id="property-turnfloorusd"></a> `turnFloorUsd?` | `number` | The cost floor of ONE turn at the declared estimates: estInputTokens (default 0) plus the output bound, priced like settlement. A real turn grows with the prompt, so this is a floor, never a cap. | [packages/core/src/engine/preflight.ts:433](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L433) |
| <a id="property-uncachedloopinputfloorusd"></a> `uncachedLoopInputFloorUsd?` | `number` | The loop's input floor over its projected turns, UNCACHED (RV2007): the declared prompt floor (`estInputTokens`) re-billed at the full input rate on every projected provider turn. A floor over the static prefix: real prompts grow. Present when the shape prices and projects more than one turn. | [packages/core/src/engine/preflight.ts:441](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L441) |
| <a id="property-unpriced"></a> `unpriced?` | `true` | True when the serving model has no price row: a USD ceiling cannot bound it. | [packages/core/src/engine/preflight.ts:411](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L411) |
