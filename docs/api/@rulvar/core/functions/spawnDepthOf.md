[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / spawnDepthOf

# Function: spawnDepthOf()

```ts
function spawnDepthOf(childScope): number;
```

Defined in: [packages/core/src/orchestrator/admission.ts:225](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L225)

Nesting depth of a child scope: its workflow, agent, and plan-node segments.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `childScope` | `string` |

## Returns

`number`
