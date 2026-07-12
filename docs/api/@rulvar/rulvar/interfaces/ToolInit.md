[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolInit

# Interface: ToolInit\&lt;S\&gt;

Defined in: `packages/core/dist/index.d.ts`

## Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-execute"></a> `execute` | (`input`, `ctx`) => `Promise`\&lt;`unknown`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-executor"></a> `executor?` | [`ToolExecutor`](/api/@rulvar/rulvar/type-aliases/ToolExecutor.md) | Default 'inprocess'. | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-needsapproval"></a> `needsApproval?` | `boolean` | Default false. | `packages/core/dist/index.d.ts` |
| <a id="property-parameters"></a> `parameters` | `S` | - | `packages/core/dist/index.d.ts` |
| <a id="property-risk"></a> `risk?` | [`ToolRisk`](/api/@rulvar/rulvar/type-aliases/ToolRisk.md) | Policy metadata; never identity. | `packages/core/dist/index.d.ts` |
| <a id="property-version"></a> `version?` | `string` | Contract version, part of toolsetHash. | `packages/core/dist/index.d.ts` |
