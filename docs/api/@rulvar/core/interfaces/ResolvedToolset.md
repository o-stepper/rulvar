[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolvedToolset

# Interface: ResolvedToolset

Defined in: [packages/core/src/tools/toolset-hash.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L29)

The spawn's frozen toolset snapshot plus its identity hashes.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-authorityhash"></a> `authorityHash` | `string` | The aggregate authority hash over the per-tool records (RV1802). | [packages/core/src/tools/toolset-hash.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L34) |
| <a id="property-contracts"></a> `contracts` | [`ToolContract`](/api/@rulvar/core/interfaces/ToolContract.md)[] | - | [packages/core/src/tools/toolset-hash.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L31) |
| <a id="property-hash"></a> `hash` | `string` | - | [packages/core/src/tools/toolset-hash.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L32) |
| <a id="property-tools"></a> `tools` | [`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[] | - | [packages/core/src/tools/toolset-hash.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L30) |
