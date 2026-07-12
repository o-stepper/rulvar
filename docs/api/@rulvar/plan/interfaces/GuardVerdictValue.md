[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / GuardVerdictValue

# Interface: GuardVerdictValue

Defined in: [packages/plan/src/guards.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L47)

The journaled guard verdict payload (kind 'decision').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approachsigcoarse"></a> `approachSigCoarse?` | `string` | The frozen coarse signature (oscillation-freeze). | [packages/plan/src/guards.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L54) |
| <a id="property-decisiontype"></a> `decisionType` | `"guard-verdict"` | - | [packages/plan/src/guards.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L48) |
| <a id="property-fallback"></a> `fallback` | \| [`GuardFallback`](/api/@rulvar/plan/type-aliases/GuardFallback.md) \| `"freeze-key"` | - | [packages/plan/src/guards.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L50) |
| <a id="property-guard"></a> `guard` | \| `"dropped-revision-streak"` \| `"oscillation-freeze"` \| `"stall-replan-cap"` \| `"net-lost"` | - | [packages/plan/src/guards.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L49) |
| <a id="property-netlostusd"></a> `netLostUsd?` | `number` | - | [packages/plan/src/guards.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L58) |
| <a id="property-oscillationcount"></a> `oscillationCount?` | `number` | - | [packages/plan/src/guards.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L55) |
| <a id="property-stallreplans"></a> `stallReplans?` | `number` | The capped counter (stall-replan-cap). | [packages/plan/src/guards.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L57) |
| <a id="property-streak"></a> `streak?` | `number` | The streak at trip time (dropped-revision-streak). | [packages/plan/src/guards.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L52) |
