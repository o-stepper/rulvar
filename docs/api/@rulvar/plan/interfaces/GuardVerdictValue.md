[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / GuardVerdictValue

# Interface: GuardVerdictValue

Defined in: [packages/plan/src/guards.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L69)

The journaled guard verdict payload (kind 'decision').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approachsigcoarse"></a> `approachSigCoarse?` | `string` | The frozen coarse signature (oscillation-freeze). | [packages/plan/src/guards.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L76) |
| <a id="property-decisiontype"></a> `decisionType` | `"guard-verdict"` | - | [packages/plan/src/guards.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L70) |
| <a id="property-fallback"></a> `fallback` | \| [`GuardFallback`](/api/@rulvar/plan/type-aliases/GuardFallback.md) \| `"freeze-key"` | - | [packages/plan/src/guards.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L72) |
| <a id="property-guard"></a> `guard` | \| `"dropped-revision-streak"` \| `"oscillation-freeze"` \| `"stall-replan-cap"` \| `"net-lost"` | - | [packages/plan/src/guards.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L71) |
| <a id="property-netlostusd"></a> `netLostUsd?` | `number` | - | [packages/plan/src/guards.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L80) |
| <a id="property-oscillationcount"></a> `oscillationCount?` | `number` | - | [packages/plan/src/guards.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L77) |
| <a id="property-stallreplans"></a> `stallReplans?` | `number` | The capped counter (stall-replan-cap). | [packages/plan/src/guards.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L79) |
| <a id="property-streak"></a> `streak?` | `number` | The streak at trip time (dropped-revision-streak). | [packages/plan/src/guards.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L74) |
