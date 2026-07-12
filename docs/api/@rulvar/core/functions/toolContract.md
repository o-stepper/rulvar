[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / toolContract

# Function: toolContract()

```ts
function toolContract(def): ToolContract;
```

Defined in: [packages/core/src/tools/tool.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L73)

The identity projection: the contract tuple that enters toolsetHash.
parameters is the canonicalized derived JSON Schema (docs/03, section
"schemaHash and toolsetHash derivation").

## Parameters

| Parameter | Type |
| ------ | ------ |
| `def` | [`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md) |

## Returns

[`ToolContract`](/api/@rulvar/core/interfaces/ToolContract.md)
