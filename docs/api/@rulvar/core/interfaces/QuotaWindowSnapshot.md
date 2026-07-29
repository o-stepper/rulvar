[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaWindowSnapshot

# Interface: QuotaWindowSnapshot

Defined in: [packages/core/src/model/quota.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L240)

One rule's live counters, exposed by `snapshot()` for telemetry.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-requests"></a> `requests` | `number` | [packages/core/src/model/quota.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L243) |
| <a id="property-rule"></a> `rule` | [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md) | [packages/core/src/model/quota.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L241) |
| <a id="property-tokens"></a> `tokens` | `number` | [packages/core/src/model/quota.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L244) |
| <a id="property-windowstart"></a> `windowStart` | `number` | [packages/core/src/model/quota.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L242) |
