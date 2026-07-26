[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightSpawnReport

# Interface: PreflightSpawnReport

Defined in: [packages/core/src/engine/preflight.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L221)

The effective picture of one declared spawn shape.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissionreserveusd"></a> `admissionReserveUsd` | `number` | The layer-1 admission reserve this spawn would be admitted under. | [packages/core/src/engine/preflight.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L232) |
| <a id="property-count"></a> `count` | `number` | - | [packages/core/src/engine/preflight.ts:224](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L224) |
| <a id="property-executedtoolcallceiling"></a> `executedToolCallCeiling` | `number` \| `null` | Executed-call ceiling across any tool mix; null = unlimited. | [packages/core/src/engine/preflight.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L245) |
| <a id="property-label"></a> `label` | `string` | - | [packages/core/src/engine/preflight.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L222) |
| <a id="property-limits"></a> `limits` | [`EffectiveUsageLimits`](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | The SAME merge the runtime applies: call over profile over engine defaults. | [packages/core/src/engine/preflight.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L230) |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | The per-turn output bound: caps.maxOutputTokens clamped by the limits field. | [packages/core/src/engine/preflight.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L237) |
| <a id="property-projectedproviderturns"></a> `projectedProviderTurns` | `number` | The provider-call ceiling of ONE spawn's whole loop: maxTurns bounded by the executed-call ceiling plus its final no-tool turn, plus the finalization summary turn when a tool budget limiter arms it. Every provider turn is one wire request and one quota reservation, so this is the per-spawn multiplier of quota demand; retries sit on top of it. | [packages/core/src/engine/preflight.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L254) |
| <a id="property-reservesource"></a> `reserveSource` | \| `"estCost"` \| `"profile-estCost"` \| `"priced-estimate"` \| `"flat-default"` \| `"unpriced-zero"` | Which arm of the reserve formula produced the number. | [packages/core/src/engine/preflight.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L234) |
| <a id="property-role"></a> `role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/engine/preflight.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L223) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | The resolved serving target; absent when no model resolves (see findings). | [packages/core/src/engine/preflight.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L226) |
| <a id="property-toolceilings"></a> `toolCeilings` | [`PreflightToolCeiling`](/api/@rulvar/core/interfaces/PreflightToolCeiling.md)[] | Per-tool ceilings for every tool a cap or a unit cost names. | [packages/core/src/engine/preflight.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L256) |
| <a id="property-turnfloorusd"></a> `turnFloorUsd?` | `number` | The cost floor of ONE turn at the declared estimates: estInputTokens (default 0) plus the output bound, priced like settlement. A real turn grows with the prompt, so this is a floor, never a cap. | [packages/core/src/engine/preflight.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L243) |
| <a id="property-unpriced"></a> `unpriced?` | `true` | True when the serving model has no price row: a USD ceiling cannot bound it. | [packages/core/src/engine/preflight.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L228) |
