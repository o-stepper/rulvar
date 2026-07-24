[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaWindowSnapshot

# Interface: QuotaWindowSnapshot

Defined in: [packages/core/src/model/quota.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L190)

One rule's live counters, exposed by `snapshot()` for telemetry.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-requests"></a> `requests` | `number` | [packages/core/src/model/quota.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L193) |
| <a id="property-rule"></a> `rule` | [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md) | [packages/core/src/model/quota.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L191) |
| <a id="property-tokens"></a> `tokens` | `number` | [packages/core/src/model/quota.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L194) |
| <a id="property-windowstart"></a> `windowStart` | `number` | [packages/core/src/model/quota.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L192) |
