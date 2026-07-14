[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / nodeLinkKey

# Function: nodeLinkKey()

```ts
function nodeLinkKey(
   spawnKey, 
   donorScope, 
   targetNodeId): string;
```

Defined in: [packages/core/src/journal/reuse.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L112)

node.link identity: sha256 of {kind, spawnKey,
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
