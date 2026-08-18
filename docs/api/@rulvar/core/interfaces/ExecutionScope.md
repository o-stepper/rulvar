[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExecutionScope

# Interface: ExecutionScope

Defined in: [packages/core/src/engine/engine.ts:789](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L789)

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
| <a id="property-account"></a> `account?` | `string` | The billing account within the tenant. | [packages/core/src/engine/engine.ts:793](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L793) |
| <a id="property-project"></a> `project?` | `string` | The project or workload name. | [packages/core/src/engine/engine.ts:795](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L795) |
| <a id="property-tenant"></a> `tenant?` | `string` | The owning tenant or organization, host-defined. | [packages/core/src/engine/engine.ts:791](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L791) |
