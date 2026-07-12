[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / nodeLinkKey

# Function: nodeLinkKey()

```ts
function nodeLinkKey(
   spawnKey, 
   donorScope, 
   targetNodeId): string;
```

Defined in: [packages/core/src/journal/reuse.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L111)

node.link identity (docs/03, 9.5): sha256 of {kind, spawnKey,
donorScope, targetNodeId}; targetNodeId is deterministic on replay
because NodeIds are assigned inside plan.revision.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spawnKey` | `string` |
| `donorScope` | `string` |
| `targetNodeId` | `string` |

## Returns

`string`
