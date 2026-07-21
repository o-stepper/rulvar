[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / GuardVerdictValue

# Interface: GuardVerdictValue

Defined in: [packages/plan/src/guards.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L78)

The journaled guard verdict payload (kind 'decision').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approachsigcoarse"></a> `approachSigCoarse?` | `string` | The frozen coarse signature (oscillation-freeze). | [packages/plan/src/guards.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L85) |
| <a id="property-decisiontype"></a> `decisionType` | `"guard-verdict"` | - | [packages/plan/src/guards.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L79) |
| <a id="property-fallback"></a> `fallback` | \| [`GuardFallback`](/api/@rulvar/plan/type-aliases/GuardFallback.md) \| `"freeze-key"` | - | [packages/plan/src/guards.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L81) |
| <a id="property-guard"></a> `guard` | \| `"dropped-revision-streak"` \| `"oscillation-freeze"` \| `"stall-replan-cap"` \| `"net-lost"` | - | [packages/plan/src/guards.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L80) |
| <a id="property-netlostusd"></a> `netLostUsd?` | `number` | - | [packages/plan/src/guards.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L89) |
| <a id="property-oscillationcount"></a> `oscillationCount?` | `number` | - | [packages/plan/src/guards.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L86) |
| <a id="property-stallreplans"></a> `stallReplans?` | `number` | The capped counter (stall-replan-cap). | [packages/plan/src/guards.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L88) |
| <a id="property-streak"></a> `streak?` | `number` | The streak at trip time (dropped-revision-streak). | [packages/plan/src/guards.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L83) |
