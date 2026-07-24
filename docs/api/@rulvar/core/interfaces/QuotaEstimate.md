[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaEstimate

# Interface: QuotaEstimate

Defined in: [packages/core/src/l0/spi/quota.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L47)

The pre-dispatch estimate a reservation is admitted under. Token
estimates are heuristic (the engine uses its deterministic
four-characters-per-token prompt estimate plus the request's output
cap when one is set); reconcile() settles the difference against
actual usage inside the same accounting window.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-inputtokens"></a> `inputTokens` | `number` | Heuristic prompt estimate for the attempt. | [packages/core/src/l0/spi/quota.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L51) |
| <a id="property-maxoutputtokens"></a> `maxOutputTokens?` | `number` | The request's output token cap, when one is set. | [packages/core/src/l0/spi/quota.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L53) |
| <a id="property-requests"></a> `requests` | `number` | Wire calls this reservation admits; the engine always sends 1. | [packages/core/src/l0/spi/quota.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L49) |
