[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / toolContract

# Function: toolContract()

```ts
function toolContract(def): ToolContract;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The identity projection: the contract tuple that enters toolsetHash.
parameters is the canonicalized derived JSON Schema (docs/03, section
"schemaHash and toolsetHash derivation").

## Parameters

| Parameter | Type |
| ------ | ------ |
| `def` | [`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md) |

## Returns

[`ToolContract`](/api/@rulvar/rulvar/interfaces/ToolContract.md)
