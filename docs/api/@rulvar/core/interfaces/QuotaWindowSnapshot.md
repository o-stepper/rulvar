[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaWindowSnapshot

# Interface: QuotaWindowSnapshot

Defined in: [packages/core/src/model/quota.ts:293](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L293)

One rule's live counters, exposed by `snapshot()` for telemetry.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-requests"></a> `requests` | `number` | [packages/core/src/model/quota.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L296) |
| <a id="property-rule"></a> `rule` | [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md) | [packages/core/src/model/quota.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L294) |
| <a id="property-tokens"></a> `tokens` | `number` | [packages/core/src/model/quota.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L297) |
| <a id="property-windowstart"></a> `windowStart` | `number` | [packages/core/src/model/quota.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L295) |
