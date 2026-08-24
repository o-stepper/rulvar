[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExecutionScope

# Interface: ExecutionScope

Defined in: [packages/core/src/engine/engine.ts:842](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L842)

The bounded execution scope of one run (RV4007, the fifth
comparison experiment's P0.4): WHO this run executes for, as the
host names it. The library CARRIES the scope without loss (RunMeta,
a genesis journal decision, the invoice header, the export bundle
via its meta) and asserts identity on resume; it never interprets
it. Tenancy semantics, entitlement, and isolation policy are host
decisions: this is an attribution envelope, not IAM.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-account"></a> `account?` | `string` | The billing account within the tenant. | [packages/core/src/engine/engine.ts:846](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L846) |
| <a id="property-legaldomain"></a> `legalDomain?` | `string` | The governing legal domain (RV4205, the sixth comparison experiment's P0.2): host-defined vocabulary (a jurisdiction, a regulatory regime), the first of the three named dimensions the experiment's question bound to routing and audit. | [packages/core/src/engine/engine.ts:855](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L855) |
| <a id="property-project"></a> `project?` | `string` | The project or workload name. | [packages/core/src/engine/engine.ts:848](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L848) |
| <a id="property-provideraccount"></a> `providerAccount?` | `string` | The provider-side billing account identity, host-defined (RV4205). | [packages/core/src/engine/engine.ts:859](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L859) |
| <a id="property-region"></a> `region?` | `string` | The deployment or data-residency region, host-defined (RV4205). | [packages/core/src/engine/engine.ts:857](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L857) |
| <a id="property-sponsor"></a> `sponsor?` | `string` | The sponsoring principal of the work (RV4408, the seventh comparison experiment's benchmark domain): the party on whose behalf and at whose expense the run executes, distinct from the OWNING tenant and the BILLING account. The Aster adjudication shape is the motivating example: a network operator (tenant) adjudicates a trial financed by a study sponsor, and the sponsor identity must ride attribution, the invoice header, and the regulated posture hash without being conflated with billing. Host-defined vocabulary, like every dimension here. | [packages/core/src/engine/engine.ts:871](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L871) |
| <a id="property-tenant"></a> `tenant?` | `string` | The owning tenant or organization, host-defined. | [packages/core/src/engine/engine.ts:844](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L844) |
