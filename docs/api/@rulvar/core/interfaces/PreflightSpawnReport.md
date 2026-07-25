[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightSpawnReport

# Interface: PreflightSpawnReport

Defined in: [packages/core/src/engine/preflight.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L164)

The effective picture of one declared spawn shape.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissionreserveusd"></a> `admissionReserveUsd` | `number` | The layer-1 admission reserve this spawn would be admitted under. | [packages/core/src/engine/preflight.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L175) |
| <a id="property-count"></a> `count` | `number` | - | [packages/core/src/engine/preflight.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L167) |
| <a id="property-executedtoolcallceiling"></a> `executedToolCallCeiling` | `number` \| `null` | Executed-call ceiling across any tool mix; null = unlimited. | [packages/core/src/engine/preflight.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L188) |
| <a id="property-label"></a> `label` | `string` | - | [packages/core/src/engine/preflight.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L165) |
| <a id="property-limits"></a> `limits` | [`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | The SAME merge the runtime applies: call over profile over engine defaults. | [packages/core/src/engine/preflight.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L173) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | The per-turn output bound: caps.maxOutputTokens clamped by the limits field. | [packages/core/src/engine/preflight.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L180) |
| <a id="property-reservesource"></a> `reserveSource` | \| `"estCost"` \| `"profile-estCost"` \| `"priced-estimate"` \| `"flat-default"` \| `"unpriced-zero"` | Which arm of the reserve formula produced the number. | [packages/core/src/engine/preflight.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L177) |
| <a id="property-role"></a> `role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/engine/preflight.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L166) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | The resolved serving target; absent when no model resolves (see findings). | [packages/core/src/engine/preflight.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L169) |
| <a id="property-toolceilings"></a> `toolCeilings` | [`PreflightToolCeiling`](/api/@rulvar/core/interfaces/PreflightToolCeiling.md)[] | Per-tool ceilings for every tool a cap or a unit cost names. | [packages/core/src/engine/preflight.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L190) |
| <a id="property-turnfloorusd"></a> `turnFloorUsd?` | `number` | The cost floor of ONE turn at the declared estimates: estInputTokens (default 0) plus the output bound, priced like settlement. A real turn grows with the prompt, so this is a floor, never a cap. | [packages/core/src/engine/preflight.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L186) |
| <a id="property-unpriced"></a> `unpriced?` | `true` | True when the serving model has no price row: a USD ceiling cannot bound it. | [packages/core/src/engine/preflight.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L171) |
