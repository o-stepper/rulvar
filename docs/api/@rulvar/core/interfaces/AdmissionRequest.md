[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionRequest

# Interface: AdmissionRequest

Defined in: [packages/core/src/l0/spi/admission.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L57)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-emergency"></a> `emergency?` | `boolean` | Host-flagged emergency work; admitted from the reserve fraction. | [packages/core/src/l0/spi/admission.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L81) |
| <a id="property-generation"></a> `generation` | `string` | The unit's incarnation token (RunMeta.genesis, typically). | [packages/core/src/l0/spi/admission.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L61) |
| <a id="property-reservation"></a> `reservation` | [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) | - | [packages/core/src/l0/spi/admission.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L79) |
| <a id="property-resolvedtenant"></a> `resolvedTenant?` | `string` | The RESOLVED effective tenant, computed by exactly the tenantFrom resolution the limiter request uses: the engine-configured tenant by default, the scope's under `quota.tenantFrom: 'scope'`. Carried as its own field so the two seams debit the SAME identity. | [packages/core/src/l0/spi/admission.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L68) |
| <a id="property-scope"></a> `scope?` | [`AdmissionScopeDimensions`](/api/@rulvar/core/interfaces/AdmissionScopeDimensions.md) | - | [packages/core/src/l0/spi/admission.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L76) |
| <a id="property-tenantfromscope"></a> `tenantFromScope?` | `boolean` | True when the deployment declared `tenantFrom: 'scope'`, the one configuration in which a disagreement between `resolvedTenant` and `scope.tenant` has a documented meaning; outside it the disagreement refuses typed (RFC section 4.1, item 1). | [packages/core/src/l0/spi/admission.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L75) |
| <a id="property-unitid"></a> `unitId` | `string` | Caller-minted unit identity: the run id, typically. | [packages/core/src/l0/spi/admission.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L59) |
| <a id="property-weight"></a> `weight?` | `number` | Fairness weight of the member; positive, default 1. | [packages/core/src/l0/spi/admission.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L78) |
