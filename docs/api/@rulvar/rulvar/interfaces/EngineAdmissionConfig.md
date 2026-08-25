[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EngineAdmissionConfig

# Interface: EngineAdmissionConfig

Defined in: `packages/core/dist/index.d.ts`

The `createEngine` admission configuration.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-pollms"></a> `pollMs?` | `number` | Queued-wait poll interval when the scheduler names no retryAfterMs. | `packages/core/dist/index.d.ts` |
| <a id="property-renewms"></a> `renewMs?` | `number` | Lease renew cadence; default four polls. | `packages/core/dist/index.d.ts` |
| <a id="property-reservation"></a> `reservation?` | [`AdmissionReservation`](/api/@rulvar/rulvar/interfaces/AdmissionReservation.md) | The per-run reservation; default one wire. | `packages/core/dist/index.d.ts` |
| <a id="property-scheduler"></a> `scheduler` | [`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-tenant"></a> `tenant?` | `string` | The effective tenant, when the deployment runs admission without a quota limiter; a configured `quota.tenant` takes precedence so the two seams debit the SAME identity (RFC section 4.1). | `packages/core/dist/index.d.ts` |
| <a id="property-tenantfrom"></a> `tenantFrom?` | `"scope"` | Mirrors quota.tenantFrom for limiter-less deployments. | `packages/core/dist/index.d.ts` |
