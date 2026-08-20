[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExecutionScope

# Interface: ExecutionScope

Defined in: [packages/core/src/engine/engine.ts:810](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L810)

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
| <a id="property-account"></a> `account?` | `string` | The billing account within the tenant. | [packages/core/src/engine/engine.ts:814](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L814) |
| <a id="property-legaldomain"></a> `legalDomain?` | `string` | The governing legal domain (RV4205, the sixth comparison experiment's P0.2): host-defined vocabulary (a jurisdiction, a regulatory regime), the first of the three named dimensions the experiment's question bound to routing and audit. | [packages/core/src/engine/engine.ts:823](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L823) |
| <a id="property-project"></a> `project?` | `string` | The project or workload name. | [packages/core/src/engine/engine.ts:816](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L816) |
| <a id="property-provideraccount"></a> `providerAccount?` | `string` | The provider-side billing account identity, host-defined (RV4205). | [packages/core/src/engine/engine.ts:827](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L827) |
| <a id="property-region"></a> `region?` | `string` | The deployment or data-residency region, host-defined (RV4205). | [packages/core/src/engine/engine.ts:825](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L825) |
| <a id="property-tenant"></a> `tenant?` | `string` | The owning tenant or organization, host-defined. | [packages/core/src/engine/engine.ts:812](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L812) |
