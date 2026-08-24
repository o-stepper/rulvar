[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionTicket

# Interface: AdmissionTicket

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-arrivalseq"></a> `arrivalSeq` | `number` | Store-assigned, totally ordered per queue; the SFQ tie-break. | `packages/core/dist/index.d.ts` |
| <a id="property-cover"></a> `cover?` | [`AdmissionReservation`](/api/@rulvar/rulvar/interfaces/AdmissionReservation.md) | Monotone high-water cover of consumption (checkpoint THEN consume). | `packages/core/dist/index.d.ts` |
| <a id="property-deniedreason"></a> `deniedReason?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-enqueuedatms"></a> `enqueuedAtMs` | `number` | Millisecond instants of the injectable clock. | `packages/core/dist/index.d.ts` |
| <a id="property-finishtag"></a> `finishTag` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-generation"></a> `generation` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-grantedatms"></a> `grantedAtMs?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-leaseexpiresatms"></a> `leaseExpiresAtMs?` | `number` | The grant lease; expiry settles conservatively (section 4.3). | `packages/core/dist/index.d.ts` |
| <a id="property-reservation"></a> `reservation` | [`AdmissionReservation`](/api/@rulvar/rulvar/interfaces/AdmissionReservation.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-resolvedtenant"></a> `resolvedTenant?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope?` | [`AdmissionScopeDimensions`](/api/@rulvar/rulvar/interfaces/AdmissionScopeDimensions.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-starttag"></a> `startTag` | `number` | Start-time fair queuing tags (RFC section 4.2, item 3). | `packages/core/dist/index.d.ts` |
| <a id="property-state"></a> `state` | [`AdmissionTicketState`](/api/@rulvar/rulvar/type-aliases/AdmissionTicketState.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-unitid"></a> `unitId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-weight"></a> `weight` | `number` | - | `packages/core/dist/index.d.ts` |
