[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionTicket

# Interface: AdmissionTicket

Defined in: [packages/core/src/l0/spi/admission.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L94)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-arrivalseq"></a> `arrivalSeq` | `number` | Store-assigned, totally ordered per queue; the SFQ tie-break. | [packages/core/src/l0/spi/admission.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L103) |
| <a id="property-cover"></a> `cover?` | [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) | Monotone high-water cover of consumption (checkpoint THEN consume). | [packages/core/src/l0/spi/admission.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L113) |
| <a id="property-deniedreason"></a> `deniedReason?` | `string` | - | [packages/core/src/l0/spi/admission.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L114) |
| <a id="property-enqueuedatms"></a> `enqueuedAtMs` | `number` | Millisecond instants of the injectable clock. | [packages/core/src/l0/spi/admission.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L108) |
| <a id="property-finishtag"></a> `finishTag` | `number` | - | [packages/core/src/l0/spi/admission.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L106) |
| <a id="property-generation"></a> `generation` | `string` | - | [packages/core/src/l0/spi/admission.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L96) |
| <a id="property-grantedatms"></a> `grantedAtMs?` | `number` | - | [packages/core/src/l0/spi/admission.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L109) |
| <a id="property-leaseexpiresatms"></a> `leaseExpiresAtMs?` | `number` | The grant lease; expiry settles conservatively (section 4.3). | [packages/core/src/l0/spi/admission.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L111) |
| <a id="property-reservation"></a> `reservation` | [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) | - | [packages/core/src/l0/spi/admission.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L100) |
| <a id="property-resolvedtenant"></a> `resolvedTenant?` | `string` | - | [packages/core/src/l0/spi/admission.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L98) |
| <a id="property-scope"></a> `scope?` | [`AdmissionScopeDimensions`](/api/@rulvar/core/interfaces/AdmissionScopeDimensions.md) | - | [packages/core/src/l0/spi/admission.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L99) |
| <a id="property-starttag"></a> `startTag` | `number` | Start-time fair queuing tags (RFC section 4.2, item 3). | [packages/core/src/l0/spi/admission.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L105) |
| <a id="property-state"></a> `state` | [`AdmissionTicketState`](/api/@rulvar/core/type-aliases/AdmissionTicketState.md) | - | [packages/core/src/l0/spi/admission.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L97) |
| <a id="property-unitid"></a> `unitId` | `string` | - | [packages/core/src/l0/spi/admission.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L95) |
| <a id="property-weight"></a> `weight` | `number` | - | [packages/core/src/l0/spi/admission.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L101) |
