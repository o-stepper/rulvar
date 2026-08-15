[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightSpawnReport

# Interface: PreflightSpawnReport

Defined in: [packages/core/src/engine/preflight.ts:368](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L368)

The effective picture of one declared spawn shape.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissionreserveusd"></a> `admissionReserveUsd` | `number` | The layer-1 admission reserve this spawn would be admitted under. | [packages/core/src/engine/preflight.ts:386](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L386) |
| <a id="property-cachedloopinputfloorusd"></a> `cachedLoopInputFloorUsd?` | `number` | The same loop under the RV2006 cache policy: one cache write of the prompt floor plus a cache read on every later turn, priced by the row's cache rates. Present beside the uncached figure when the row carries cache rates. The parity worker shape (36k-token prompt floor, a long cycle) prices the difference at roughly three to four times, the gap between four seats fitting a $6 envelope and three seats dying against it. | [packages/core/src/engine/preflight.ts:415](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L415) |
| <a id="property-count"></a> `count` | `number` | - | [packages/core/src/engine/preflight.ts:371](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L371) |
| <a id="property-executedtoolcallceiling"></a> `executedToolCallCeiling` | `number` \| `null` | Executed-call ceiling across any tool mix; null = unlimited. | [packages/core/src/engine/preflight.ts:417](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L417) |
| <a id="property-label"></a> `label` | `string` | - | [packages/core/src/engine/preflight.ts:369](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L369) |
| <a id="property-limits"></a> `limits` | [`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | The SAME merge the runtime applies: call over profile over engine defaults. | [packages/core/src/engine/preflight.ts:384](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L384) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | The per-turn output bound: caps.maxOutputTokens clamped by the limits field. | [packages/core/src/engine/preflight.ts:391](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L391) |
| <a id="property-projectedproviderturns"></a> `projectedProviderTurns` | `number` | The provider-call ceiling of ONE spawn's whole loop: maxTurns bounded by the executed-call ceiling plus its final no-tool turn, plus the finalization summary turn when a tool budget limiter arms it. Every provider turn is one wire request and one quota reservation, so this is the per-spawn multiplier of quota demand; retries sit on top of it. | [packages/core/src/engine/preflight.ts:426](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L426) |
| <a id="property-ratesverifiedat"></a> `ratesVerifiedAt?` | `string` | The serving row's last rates verification date (RV814), copied from the resolved pricing; absent when the row names none. Every dollar in this report is priced under that row, so its staleness is part of the projection's honesty. | [packages/core/src/engine/preflight.ts:382](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L382) |
| <a id="property-reservesource"></a> `reserveSource` | \| `"estCost"` \| `"profile-estCost"` \| `"priced-estimate"` \| `"flat-default"` \| `"unpriced-zero"` | Which arm of the reserve formula produced the number. | [packages/core/src/engine/preflight.ts:388](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L388) |
| <a id="property-role"></a> `role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/engine/preflight.ts:370](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L370) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | The resolved serving target; absent when no model resolves (see findings). | [packages/core/src/engine/preflight.ts:373](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L373) |
| <a id="property-toolceilings"></a> `toolCeilings` | [`PreflightToolCeiling`](/api/@rulvar/core/interfaces/PreflightToolCeiling.md)[] | Per-tool ceilings for every tool a cap or a unit cost names. | [packages/core/src/engine/preflight.ts:428](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L428) |
| <a id="property-turnfloorusd"></a> `turnFloorUsd?` | `number` | The cost floor of ONE turn at the declared estimates: estInputTokens (default 0) plus the output bound, priced like settlement. A real turn grows with the prompt, so this is a floor, never a cap. | [packages/core/src/engine/preflight.ts:397](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L397) |
| <a id="property-uncachedloopinputfloorusd"></a> `uncachedLoopInputFloorUsd?` | `number` | The loop's input floor over its projected turns, UNCACHED (RV2007): the declared prompt floor (`estInputTokens`) re-billed at the full input rate on every projected provider turn. A floor over the static prefix: real prompts grow. Present when the shape prices and projects more than one turn. | [packages/core/src/engine/preflight.ts:405](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L405) |
| <a id="property-unpriced"></a> `unpriced?` | `true` | True when the serving model has no price row: a USD ceiling cannot bound it. | [packages/core/src/engine/preflight.ts:375](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L375) |
