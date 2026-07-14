[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / unparkPlacementOf

# Function: unparkPlacementOf()

```ts
function unparkPlacementOf(input): UnparkPlacement;
```

Defined in: [packages/plan/src/park.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/park.ts#L84)

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | \{ `checkpointRef?`: `number`; `isolation?`: [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md); `transcriptRef?`: `string`; `worktreePinned`: `boolean`; \} | - |
| `input.checkpointRef?` | `number` | The parked node's recorded checkpoint anchor (root dispatch seq). |
| `input.isolation?` | [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md) | - |
| `input.transcriptRef?` | `string` | The retained transcript ref derived from the anchor, when any. |
| `input.worktreePinned` | `boolean` | - |

## Returns

[`UnparkPlacement`](/api/@rulvar/plan/interfaces/UnparkPlacement.md)
