[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolRuntime

# Interface: ToolRuntime

Defined in: [packages/core/src/runtime/agent-loop.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L232)

The spawn's frozen toolset plus the per-call context factory, prepared
by the ctx layer (M3-T01). The contracts are the canonical identity
projection already hashed into the spawn's content key; the loop sends
exactly them to the model.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-contracts"></a> `contracts` | [`ToolContract`](/api/@rulvar/core/interfaces/ToolContract.md)[] | - | [packages/core/src/runtime/agent-loop.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L234) |
| <a id="property-defs"></a> `defs` | [`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[] | - | [packages/core/src/runtime/agent-loop.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L233) |
| <a id="property-permission"></a> `permission?` | (`call`) => `Promise`\&lt;[`PermissionGate`](/api/@rulvar/core/type-aliases/PermissionGate.md)\&gt; | Permission chain evaluation (M3-T03); absent = every call allowed. | [packages/core/src/runtime/agent-loop.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L238) |

## Methods

### contextFor()

```ts
contextFor(toolName): ToolContext;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L236)

Mints a per-call ToolContext (fresh tool span under the agent span).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `toolName` | `string` |

#### Returns

[`ToolContext`](/api/@rulvar/core/interfaces/ToolContext.md)
