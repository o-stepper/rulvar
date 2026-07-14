[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / nodeLinkKey

# Function: nodeLinkKey()

```ts
function nodeLinkKey(
   spawnKey, 
   donorScope, 
   targetNodeId): string;
```

Defined in: `packages/core/dist/index.d.ts`

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
