[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PreflightSpawnReport

# Interface: PreflightSpawnReport

Defined in: `packages/core/dist/index.d.ts`

The effective picture of one declared spawn shape.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissionreserveusd"></a> `admissionReserveUsd` | `number` | The layer-1 admission reserve this spawn would be admitted under. | `packages/core/dist/index.d.ts` |
| <a id="property-count"></a> `count` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-executedtoolcallceiling"></a> `executedToolCallCeiling` | `number` \| `null` | Executed-call ceiling across any tool mix; null = unlimited. | `packages/core/dist/index.d.ts` |
| <a id="property-label"></a> `label` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits` | [`EffectiveUsageLimits`](/api/@rulvar/rulvar/interfaces/EffectiveUsageLimits.md) | The SAME merge the runtime applies: call over profile over engine defaults. | `packages/core/dist/index.d.ts` |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | The per-turn output bound: caps.maxOutputTokens clamped by the limits field. | `packages/core/dist/index.d.ts` |
| <a id="property-reservesource"></a> `reserveSource` | \| `"estCost"` \| `"profile-estCost"` \| `"priced-estimate"` \| `"flat-default"` \| `"unpriced-zero"` | Which arm of the reserve formula produced the number. | `packages/core/dist/index.d.ts` |
| <a id="property-role"></a> `role` | [`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | The resolved serving target; absent when no model resolves (see findings). | `packages/core/dist/index.d.ts` |
| <a id="property-toolceilings"></a> `toolCeilings` | [`PreflightToolCeiling`](/api/@rulvar/rulvar/interfaces/PreflightToolCeiling.md)[] | Per-tool ceilings for every tool a cap or a unit cost names. | `packages/core/dist/index.d.ts` |
| <a id="property-turnfloorusd"></a> `turnFloorUsd?` | `number` | The cost floor of ONE turn at the declared estimates: estInputTokens (default 0) plus the output bound, priced like settlement. A real turn grows with the prompt, so this is a floor, never a cap. | `packages/core/dist/index.d.ts` |
| <a id="property-unpriced"></a> `unpriced?` | `true` | True when the serving model has no price row: a USD ceiling cannot bound it. | `packages/core/dist/index.d.ts` |
