[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightSpawnReport

# Interface: PreflightSpawnReport

Defined in: [packages/core/src/engine/preflight.ts:272](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L272)

The effective picture of one declared spawn shape.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissionreserveusd"></a> `admissionReserveUsd` | `number` | The layer-1 admission reserve this spawn would be admitted under. | [packages/core/src/engine/preflight.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L290) |
| <a id="property-count"></a> `count` | `number` | - | [packages/core/src/engine/preflight.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L275) |
| <a id="property-executedtoolcallceiling"></a> `executedToolCallCeiling` | `number` \| `null` | Executed-call ceiling across any tool mix; null = unlimited. | [packages/core/src/engine/preflight.ts:303](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L303) |
| <a id="property-label"></a> `label` | `string` | - | [packages/core/src/engine/preflight.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L273) |
| <a id="property-limits"></a> `limits` | [`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | The SAME merge the runtime applies: call over profile over engine defaults. | [packages/core/src/engine/preflight.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L288) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | The per-turn output bound: caps.maxOutputTokens clamped by the limits field. | [packages/core/src/engine/preflight.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L295) |
| <a id="property-projectedproviderturns"></a> `projectedProviderTurns` | `number` | The provider-call ceiling of ONE spawn's whole loop: maxTurns bounded by the executed-call ceiling plus its final no-tool turn, plus the finalization summary turn when a tool budget limiter arms it. Every provider turn is one wire request and one quota reservation, so this is the per-spawn multiplier of quota demand; retries sit on top of it. | [packages/core/src/engine/preflight.ts:312](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L312) |
| <a id="property-ratesverifiedat"></a> `ratesVerifiedAt?` | `string` | The serving row's last rates verification date (RV814), copied from the resolved pricing; absent when the row names none. Every dollar in this report is priced under that row, so its staleness is part of the projection's honesty. | [packages/core/src/engine/preflight.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L286) |
| <a id="property-reservesource"></a> `reserveSource` | \| `"estCost"` \| `"profile-estCost"` \| `"priced-estimate"` \| `"flat-default"` \| `"unpriced-zero"` | Which arm of the reserve formula produced the number. | [packages/core/src/engine/preflight.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L292) |
| <a id="property-role"></a> `role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/engine/preflight.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L274) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | The resolved serving target; absent when no model resolves (see findings). | [packages/core/src/engine/preflight.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L277) |
| <a id="property-toolceilings"></a> `toolCeilings` | [`PreflightToolCeiling`](/api/@rulvar/core/interfaces/PreflightToolCeiling.md)[] | Per-tool ceilings for every tool a cap or a unit cost names. | [packages/core/src/engine/preflight.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L314) |
| <a id="property-turnfloorusd"></a> `turnFloorUsd?` | `number` | The cost floor of ONE turn at the declared estimates: estInputTokens (default 0) plus the output bound, priced like settlement. A real turn grows with the prompt, so this is a floor, never a cap. | [packages/core/src/engine/preflight.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L301) |
| <a id="property-unpriced"></a> `unpriced?` | `true` | True when the serving model has no price row: a USD ceiling cannot bound it. | [packages/core/src/engine/preflight.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L279) |
