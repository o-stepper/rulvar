[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaWindowSnapshot

# Interface: QuotaWindowSnapshot

Defined in: [packages/core/src/model/quota.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L337)

One rule's live counters, exposed by `snapshot()` for telemetry.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-requests"></a> `requests` | `number` | [packages/core/src/model/quota.ts:340](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L340) |
| <a id="property-rule"></a> `rule` | [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md) | [packages/core/src/model/quota.ts:338](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L338) |
| <a id="property-tokens"></a> `tokens` | `number` | [packages/core/src/model/quota.ts:341](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L341) |
| <a id="property-windowstart"></a> `windowStart` | `number` | [packages/core/src/model/quota.ts:339](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L339) |
