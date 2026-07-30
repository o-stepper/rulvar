[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaWindowSnapshot

# Interface: QuotaWindowSnapshot

Defined in: [packages/core/src/model/quota.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L274)

One rule's live counters, exposed by `snapshot()` for telemetry.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-requests"></a> `requests` | `number` | [packages/core/src/model/quota.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L277) |
| <a id="property-rule"></a> `rule` | [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md) | [packages/core/src/model/quota.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L275) |
| <a id="property-tokens"></a> `tokens` | `number` | [packages/core/src/model/quota.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L278) |
| <a id="property-windowstart"></a> `windowStart` | `number` | [packages/core/src/model/quota.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L276) |
