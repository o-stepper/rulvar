[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolRuntime

# Interface: ToolRuntime

Defined in: [packages/core/src/runtime/agent-loop.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L273)

The spawn's frozen toolset plus the per-call context factory, prepared
by the ctx layer (M3-T01). The contracts are the canonical identity
projection already hashed into the spawn's content key; the loop sends
exactly them to the model.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-contracts"></a> `contracts` | [`ToolContract`](/api/@rulvar/core/interfaces/ToolContract.md)[] | - | [packages/core/src/runtime/agent-loop.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L275) |
| <a id="property-defs"></a> `defs` | [`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[] | - | [packages/core/src/runtime/agent-loop.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L274) |
| <a id="property-executeexternal"></a> `executeExternal?` | (`def`, `args`, `ordinal`) => `Promise`\&lt;`unknown`\&gt; | Runs a non-inprocess tool out of process through the engine's registered ToolExecutorProvider (RV-216). Present whenever the frozen toolset holds any non-inprocess tool; the ctx layer mints the tool span and idempotency key and wires the provider. A throw becomes the call's error tool result exactly like an inprocess execute throw. `ordinal` is the call's 1-based position in this agent invocation's tool loop (checkpoint-stable across suspension and crash resume); the ctx layer folds it with the agent entry's seq into the idempotency key, so two separate calls with identical arguments do not collide while an at-least-once retry of one call keeps its key (P0.4). | [packages/core/src/runtime/agent-loop.ts:293](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L293) |
| <a id="property-permission"></a> `permission?` | (`call`) => `Promise`\&lt;[`PermissionGate`](/api/@rulvar/core/type-aliases/PermissionGate.md)\&gt; | Permission chain evaluation (M3-T03); absent = every call allowed. | [packages/core/src/runtime/agent-loop.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L279) |

## Methods

### contextFor()

```ts
contextFor(toolName): ToolContext;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L277)

Mints a per-call ToolContext (fresh tool span under the agent span).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `toolName` | `string` |

#### Returns

[`ToolContext`](/api/@rulvar/core/interfaces/ToolContext.md)
