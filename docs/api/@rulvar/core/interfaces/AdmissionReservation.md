[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionReservation

# Interface: AdmissionReservation

Defined in: [packages/core/src/l0/spi/admission.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L38)

The four reservation measures (RFC section 4.3).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-exposureusd"></a> `exposureUsd?` | `number` | - | [packages/core/src/l0/spi/admission.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L43) |
| <a id="property-inputtokens"></a> `inputTokens?` | `number` | - | [packages/core/src/l0/spi/admission.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L41) |
| <a id="property-usd"></a> `usd?` | `number` | - | [packages/core/src/l0/spi/admission.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L42) |
| <a id="property-wires"></a> `wires` | `number` | The one scheduler COST unit; everything else gates feasibility. | [packages/core/src/l0/spi/admission.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L40) |
