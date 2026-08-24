[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionLevelKeys

# Interface: AdmissionLevelKeys

Defined in: `packages/core/dist/index.d.ts`

The three bucket levels (RFC section 4.1): the resolved effective
tenant; tenant plus providerAccount; the full scope digest. Keys are
the JCS serialization of the level's projected sub-scope, canonical
bytes everywhere, so the shipped limiters' addressing split never
leaks into this seam. A level with nothing to key (no resolved
tenant, no provider account) is absent rather than a phantom global
bucket: fail-closed matching happens in the scheduler, not here.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-provideraccount"></a> `providerAccount?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-tenant"></a> `tenant?` | `string` | `packages/core/dist/index.d.ts` |
