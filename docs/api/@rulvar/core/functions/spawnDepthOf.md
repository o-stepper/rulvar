[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / spawnDepthOf

# Function: spawnDepthOf()

```ts
function spawnDepthOf(childScope): number;
```

Defined in: [packages/core/src/orchestrator/admission.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L195)

Nesting depth of a child scope: its workflow, agent, and plan-node segments.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `childScope` | `string` |

## Returns

`number`
