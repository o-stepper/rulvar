[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EngineAdmissionConfig

# Interface: EngineAdmissionConfig

Defined in: [packages/core/src/admission/engine-bracket.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L43)

The `createEngine` admission configuration.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-onleaselost"></a> `onLeaseLost?` | `"continue"` \| `"cancel"` | What the bracket does when the lease is LOST (RV4910): the scheduler expired the grant under this live run and parked its concurrency slot. `'continue'` (default) announces it once and lets the run go on (the wire quota still gates every dispatch; the settle release returns the slot). `'cancel'` cancels the run through its own cancellation machinery, so a hard cap deployment never runs work whose grant it cannot prove; under it every renew tick verifies by recover, so a lease that expired without a thrown renew is noticed within one renew cadence. | [packages/core/src/admission/engine-bracket.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L70) |
| <a id="property-pollms"></a> `pollMs?` | `number` | Queued-wait poll interval when the scheduler names no retryAfterMs. | [packages/core/src/admission/engine-bracket.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L48) |
| <a id="property-renewms"></a> `renewMs?` | `number` | Lease renew cadence; default four polls. | [packages/core/src/admission/engine-bracket.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L50) |
| <a id="property-reservation"></a> `reservation?` | [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) | The per-run reservation; default one wire. | [packages/core/src/admission/engine-bracket.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L46) |
| <a id="property-scheduler"></a> `scheduler` | [`AdmissionScheduler`](/api/@rulvar/core/interfaces/AdmissionScheduler.md) | - | [packages/core/src/admission/engine-bracket.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L44) |
| <a id="property-tenant"></a> `tenant?` | `string` | The effective tenant, when the deployment runs admission without a quota limiter; a configured `quota.tenant` takes precedence so the two seams debit the SAME identity (RFC section 4.1). | [packages/core/src/admission/engine-bracket.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L56) |
| <a id="property-tenantfrom"></a> `tenantFrom?` | `"scope"` | Mirrors quota.tenantFrom for limiter-less deployments. | [packages/core/src/admission/engine-bracket.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L58) |
