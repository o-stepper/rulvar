[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolRuntime

# Interface: ToolRuntime

Defined in: `packages/core/dist/index.d.ts`

The spawn's frozen toolset plus the per-call context factory, prepared
by the ctx layer (M3-T01). The contracts are the canonical identity
projection already hashed into the spawn's content key; the loop sends
exactly them to the model.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-contracts"></a> `contracts` | [`ToolContract`](/api/@rulvar/rulvar/interfaces/ToolContract.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-defs"></a> `defs` | [`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-permission"></a> `permission?` | (`call`) => `Promise`\&lt;[`PermissionGate`](/api/@rulvar/rulvar/type-aliases/PermissionGate.md)\&gt; | Permission chain evaluation (M3-T03); absent = every call allowed. | `packages/core/dist/index.d.ts` |

## Methods

### contextFor()

```ts
contextFor(toolName): ToolContext;
```

Defined in: `packages/core/dist/index.d.ts`

Mints a per-call ToolContext (fresh tool span under the agent span).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `toolName` | `string` |

#### Returns

[`ToolContext`](/api/@rulvar/rulvar/interfaces/ToolContext.md)
