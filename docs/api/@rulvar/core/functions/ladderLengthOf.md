[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ladderLengthOf

# Function: ladderLengthOf()

```ts
function ladderLengthOf(profile): number;
```

Defined in: [packages/core/src/journal/termination.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L102)

Reads the declared ladder length of one agent profile. Ladders are
declared through the profile's ModelSpec (`model: { ladder }`, or the
loop-role routing entry; docs/04, section 12). The reader is defensive
so the snapshot is total over every registry shape (an undeclared
ladder has length 1: the single implicit rung).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profile` | `unknown` |

## Returns

`number`
