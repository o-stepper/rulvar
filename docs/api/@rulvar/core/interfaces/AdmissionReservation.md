[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionReservation

# Interface: AdmissionReservation

Defined in: [packages/core/src/l0/spi/admission.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L45)

The reservation measures (RFC section 4.3). `wires` is the one
measure admission CAPS (and the SFQ cost unit); `inputTokens`,
`usd`, and `exposureUsd` ride the ticket for the holder's own
accounting and are never limited here (RV4909): money is the
budget layer's bound, and active work per level is bounded by the
level's `concurrency` semaphore.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-exposureusd"></a> `exposureUsd?` | `number` | - | [packages/core/src/l0/spi/admission.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L50) |
| <a id="property-inputtokens"></a> `inputTokens?` | `number` | - | [packages/core/src/l0/spi/admission.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L48) |
| <a id="property-usd"></a> `usd?` | `number` | - | [packages/core/src/l0/spi/admission.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L49) |
| <a id="property-wires"></a> `wires` | `number` | The one scheduler COST unit and the one capped measure. | [packages/core/src/l0/spi/admission.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L47) |
