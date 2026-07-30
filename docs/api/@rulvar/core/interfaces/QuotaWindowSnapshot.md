[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaWindowSnapshot

# Interface: QuotaWindowSnapshot

Defined in: [packages/core/src/model/quota.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L263)

One rule's live counters, exposed by `snapshot()` for telemetry.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-requests"></a> `requests` | `number` | [packages/core/src/model/quota.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L266) |
| <a id="property-rule"></a> `rule` | [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md) | [packages/core/src/model/quota.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L264) |
| <a id="property-tokens"></a> `tokens` | `number` | [packages/core/src/model/quota.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L267) |
| <a id="property-windowstart"></a> `windowStart` | `number` | [packages/core/src/model/quota.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L265) |
