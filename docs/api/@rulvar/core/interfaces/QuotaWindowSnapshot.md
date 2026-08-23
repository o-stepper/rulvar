[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaWindowSnapshot

# Interface: QuotaWindowSnapshot

Defined in: [packages/core/src/model/quota.ts:344](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L344)

One rule's live counters, exposed by `snapshot()` for telemetry.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-requests"></a> `requests` | `number` | [packages/core/src/model/quota.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L347) |
| <a id="property-rule"></a> `rule` | [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md) | [packages/core/src/model/quota.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L345) |
| <a id="property-tokens"></a> `tokens` | `number` | [packages/core/src/model/quota.ts:348](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L348) |
| <a id="property-windowstart"></a> `windowStart` | `number` | [packages/core/src/model/quota.ts:346](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L346) |
