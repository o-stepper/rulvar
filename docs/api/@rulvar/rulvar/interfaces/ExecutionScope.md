[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ExecutionScope

# Interface: ExecutionScope

Defined in: `packages/core/dist/index.d.ts`

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
| <a id="property-account"></a> `account?` | `string` | The billing account within the tenant. | `packages/core/dist/index.d.ts` |
| <a id="property-project"></a> `project?` | `string` | The project or workload name. | `packages/core/dist/index.d.ts` |
| <a id="property-tenant"></a> `tenant?` | `string` | The owning tenant or organization, host-defined. | `packages/core/dist/index.d.ts` |
