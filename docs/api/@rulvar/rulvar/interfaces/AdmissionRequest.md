[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionRequest

# Interface: AdmissionRequest

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-emergency"></a> `emergency?` | `boolean` | Host-flagged emergency work; admitted from the reserve fraction. | `packages/core/dist/index.d.ts` |
| <a id="property-generation"></a> `generation` | `string` | The unit's incarnation token (RunMeta.genesis, typically). | `packages/core/dist/index.d.ts` |
| <a id="property-reservation"></a> `reservation` | [`AdmissionReservation`](/api/@rulvar/rulvar/interfaces/AdmissionReservation.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-resolvedtenant"></a> `resolvedTenant?` | `string` | The RESOLVED effective tenant, computed by exactly the tenantFrom resolution the limiter request uses: the engine-configured tenant by default, the scope's under `quota.tenantFrom: 'scope'`. Carried as its own field so the two seams debit the SAME identity. | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope?` | [`AdmissionScopeDimensions`](/api/@rulvar/rulvar/interfaces/AdmissionScopeDimensions.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-tenantfromscope"></a> `tenantFromScope?` | `boolean` | True when the deployment declared `tenantFrom: 'scope'`, the one configuration in which a disagreement between `resolvedTenant` and `scope.tenant` has a documented meaning; outside it the disagreement refuses typed (RFC section 4.1, item 1). | `packages/core/dist/index.d.ts` |
| <a id="property-unitid"></a> `unitId` | `string` | Caller-minted unit identity: the run id, typically. | `packages/core/dist/index.d.ts` |
| <a id="property-weight"></a> `weight?` | `number` | Fairness weight of the member; positive, default 1. | `packages/core/dist/index.d.ts` |
