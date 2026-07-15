[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ladderLengthOf

# Function: ladderLengthOf()

```ts
function ladderLengthOf(profile): number;
```

Defined in: [packages/core/src/journal/termination.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L107)

Reads the declared ladder length of one agent profile. Ladders are
declared through the profile's ModelSpec (`model: { ladder }`, or the
loop-role routing entry). The reader is defensive
so the snapshot is total over every registry shape (an undeclared
ladder has length 1: the single implicit rung).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profile` | `unknown` |

## Returns

`number`
