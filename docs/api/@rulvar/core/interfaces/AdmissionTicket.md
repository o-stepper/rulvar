[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionTicket

# Interface: AdmissionTicket

Defined in: [packages/core/src/l0/spi/admission.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L87)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-arrivalseq"></a> `arrivalSeq` | `number` | Store-assigned, totally ordered per queue; the SFQ tie-break. | [packages/core/src/l0/spi/admission.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L96) |
| <a id="property-cover"></a> `cover?` | [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) | Monotone high-water cover of consumption (checkpoint THEN consume). | [packages/core/src/l0/spi/admission.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L106) |
| <a id="property-deniedreason"></a> `deniedReason?` | `string` | - | [packages/core/src/l0/spi/admission.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L107) |
| <a id="property-enqueuedatms"></a> `enqueuedAtMs` | `number` | Millisecond instants of the injectable clock. | [packages/core/src/l0/spi/admission.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L101) |
| <a id="property-finishtag"></a> `finishTag` | `number` | - | [packages/core/src/l0/spi/admission.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L99) |
| <a id="property-generation"></a> `generation` | `string` | - | [packages/core/src/l0/spi/admission.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L89) |
| <a id="property-grantedatms"></a> `grantedAtMs?` | `number` | - | [packages/core/src/l0/spi/admission.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L102) |
| <a id="property-leaseexpiresatms"></a> `leaseExpiresAtMs?` | `number` | The grant lease; expiry settles conservatively (section 4.3). | [packages/core/src/l0/spi/admission.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L104) |
| <a id="property-reservation"></a> `reservation` | [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) | - | [packages/core/src/l0/spi/admission.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L93) |
| <a id="property-resolvedtenant"></a> `resolvedTenant?` | `string` | - | [packages/core/src/l0/spi/admission.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L91) |
| <a id="property-scope"></a> `scope?` | [`AdmissionScopeDimensions`](/api/@rulvar/core/interfaces/AdmissionScopeDimensions.md) | - | [packages/core/src/l0/spi/admission.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L92) |
| <a id="property-starttag"></a> `startTag` | `number` | Start-time fair queuing tags (RFC section 4.2, item 3). | [packages/core/src/l0/spi/admission.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L98) |
| <a id="property-state"></a> `state` | [`AdmissionTicketState`](/api/@rulvar/core/type-aliases/AdmissionTicketState.md) | - | [packages/core/src/l0/spi/admission.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L90) |
| <a id="property-unitid"></a> `unitId` | `string` | - | [packages/core/src/l0/spi/admission.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L88) |
| <a id="property-weight"></a> `weight` | `number` | - | [packages/core/src/l0/spi/admission.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L94) |
