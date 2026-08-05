[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResolvedToolset

# Interface: ResolvedToolset

Defined in: `packages/core/dist/index.d.ts`

The spawn's frozen toolset snapshot plus its identity hashes.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-authorityhash"></a> `authorityHash` | `string` | The aggregate authority hash over the per-tool records (RV1802). | `packages/core/dist/index.d.ts` |
| <a id="property-contracts"></a> `contracts` | [`ToolContract`](/api/@rulvar/rulvar/interfaces/ToolContract.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-hash"></a> `hash` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-tools"></a> `tools` | [`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[] | - | `packages/core/dist/index.d.ts` |
