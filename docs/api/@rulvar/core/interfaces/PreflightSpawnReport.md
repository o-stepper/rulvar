[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightSpawnReport

# Interface: PreflightSpawnReport

Defined in: [packages/core/src/engine/preflight.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L267)

The effective picture of one declared spawn shape.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissionreserveusd"></a> `admissionReserveUsd` | `number` | The layer-1 admission reserve this spawn would be admitted under. | [packages/core/src/engine/preflight.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L278) |
| <a id="property-count"></a> `count` | `number` | - | [packages/core/src/engine/preflight.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L270) |
| <a id="property-executedtoolcallceiling"></a> `executedToolCallCeiling` | `number` \| `null` | Executed-call ceiling across any tool mix; null = unlimited. | [packages/core/src/engine/preflight.ts:291](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L291) |
| <a id="property-label"></a> `label` | `string` | - | [packages/core/src/engine/preflight.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L268) |
| <a id="property-limits"></a> `limits` | [`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | The SAME merge the runtime applies: call over profile over engine defaults. | [packages/core/src/engine/preflight.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L276) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | The per-turn output bound: caps.maxOutputTokens clamped by the limits field. | [packages/core/src/engine/preflight.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L283) |
| <a id="property-projectedproviderturns"></a> `projectedProviderTurns` | `number` | The provider-call ceiling of ONE spawn's whole loop: maxTurns bounded by the executed-call ceiling plus its final no-tool turn, plus the finalization summary turn when a tool budget limiter arms it. Every provider turn is one wire request and one quota reservation, so this is the per-spawn multiplier of quota demand; retries sit on top of it. | [packages/core/src/engine/preflight.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L300) |
| <a id="property-reservesource"></a> `reserveSource` | \| `"estCost"` \| `"profile-estCost"` \| `"priced-estimate"` \| `"flat-default"` \| `"unpriced-zero"` | Which arm of the reserve formula produced the number. | [packages/core/src/engine/preflight.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L280) |
| <a id="property-role"></a> `role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/engine/preflight.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L269) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | The resolved serving target; absent when no model resolves (see findings). | [packages/core/src/engine/preflight.ts:272](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L272) |
| <a id="property-toolceilings"></a> `toolCeilings` | [`PreflightToolCeiling`](/api/@rulvar/core/interfaces/PreflightToolCeiling.md)[] | Per-tool ceilings for every tool a cap or a unit cost names. | [packages/core/src/engine/preflight.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L302) |
| <a id="property-turnfloorusd"></a> `turnFloorUsd?` | `number` | The cost floor of ONE turn at the declared estimates: estInputTokens (default 0) plus the output bound, priced like settlement. A real turn grows with the prompt, so this is a floor, never a cap. | [packages/core/src/engine/preflight.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L289) |
| <a id="property-unpriced"></a> `unpriced?` | `true` | True when the serving model has no price row: a USD ceiling cannot bound it. | [packages/core/src/engine/preflight.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L274) |
