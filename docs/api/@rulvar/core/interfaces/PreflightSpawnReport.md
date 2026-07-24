[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightSpawnReport

# Interface: PreflightSpawnReport

Defined in: [packages/core/src/engine/preflight.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L134)

The effective picture of one declared spawn shape.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissionreserveusd"></a> `admissionReserveUsd` | `number` | The layer-1 admission reserve this spawn would be admitted under. | [packages/core/src/engine/preflight.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L145) |
| <a id="property-count"></a> `count` | `number` | - | [packages/core/src/engine/preflight.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L137) |
| <a id="property-executedtoolcallceiling"></a> `executedToolCallCeiling` | `number` \| `null` | Executed-call ceiling across any tool mix; null = unlimited. | [packages/core/src/engine/preflight.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L157) |
| <a id="property-label"></a> `label` | `string` | - | [packages/core/src/engine/preflight.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L135) |
| <a id="property-limits"></a> `limits` | [`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | The SAME merge the runtime applies: call over profile over engine defaults. | [packages/core/src/engine/preflight.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L143) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | The per-turn output bound: caps.maxOutputTokens clamped by the limits field. | [packages/core/src/engine/preflight.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L149) |
| <a id="property-reservesource"></a> `reserveSource` | \| `"estCost"` \| `"profile-estCost"` \| `"priced-estimate"` \| `"flat-default"` \| `"unpriced-zero"` | Which arm of the reserve formula produced the number. | [packages/core/src/engine/preflight.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L147) |
| <a id="property-role"></a> `role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/engine/preflight.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L136) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | The resolved serving target; absent when no model resolves (see findings). | [packages/core/src/engine/preflight.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L139) |
| <a id="property-toolceilings"></a> `toolCeilings` | [`PreflightToolCeiling`](/api/@rulvar/core/interfaces/PreflightToolCeiling.md)[] | Per-tool ceilings for every tool a cap or a unit cost names. | [packages/core/src/engine/preflight.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L159) |
| <a id="property-turnfloorusd"></a> `turnFloorUsd?` | `number` | The cost floor of ONE turn at the declared estimates: estInputTokens (default 0) plus the output bound, priced like settlement. A real turn grows with the prompt, so this is a floor, never a cap. | [packages/core/src/engine/preflight.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L155) |
| <a id="property-unpriced"></a> `unpriced?` | `true` | True when the serving model has no price row: a USD ceiling cannot bound it. | [packages/core/src/engine/preflight.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L141) |
