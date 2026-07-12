[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolvedToolset

# Interface: ResolvedToolset

Defined in: [packages/core/src/tools/toolset-hash.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L21)

The spawn's frozen toolset snapshot plus its identity hash.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-contracts"></a> `contracts` | [`ToolContract`](/api/@rulvar/core/interfaces/ToolContract.md)[] | [packages/core/src/tools/toolset-hash.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L23) |
| <a id="property-hash"></a> `hash` | `string` | [packages/core/src/tools/toolset-hash.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L24) |
| <a id="property-tools"></a> `tools` | [`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[] | [packages/core/src/tools/toolset-hash.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L22) |
