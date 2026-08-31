[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EngineAdmissionConfig

# Interface: EngineAdmissionConfig

Defined in: [packages/core/src/admission/engine-bracket.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L38)

The `createEngine` admission configuration.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-pollms"></a> `pollMs?` | `number` | Queued-wait poll interval when the scheduler names no retryAfterMs. | [packages/core/src/admission/engine-bracket.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L43) |
| <a id="property-renewms"></a> `renewMs?` | `number` | Lease renew cadence; default four polls. | [packages/core/src/admission/engine-bracket.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L45) |
| <a id="property-reservation"></a> `reservation?` | [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) | The per-run reservation; default one wire. | [packages/core/src/admission/engine-bracket.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L41) |
| <a id="property-scheduler"></a> `scheduler` | [`AdmissionScheduler`](/api/@rulvar/core/interfaces/AdmissionScheduler.md) | - | [packages/core/src/admission/engine-bracket.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L39) |
| <a id="property-tenant"></a> `tenant?` | `string` | The effective tenant, when the deployment runs admission without a quota limiter; a configured `quota.tenant` takes precedence so the two seams debit the SAME identity (RFC section 4.1). | [packages/core/src/admission/engine-bracket.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L51) |
| <a id="property-tenantfrom"></a> `tenantFrom?` | `"scope"` | Mirrors quota.tenantFrom for limiter-less deployments. | [packages/core/src/admission/engine-bracket.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L53) |
