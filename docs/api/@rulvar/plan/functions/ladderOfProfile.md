[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / ladderOfProfile

# Function: ladderOfProfile()

```ts
function ladderOfProfile(profile): 
  | LadderSpec
  | undefined;
```

Defined in: [packages/plan/src/ladder.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L30)

Extracts the declared ladder from an agent profile: the ModelSpec union
carries it (`model: { ladder }`), or the loop-role routing entry.
The same declaration points feed ladderLengthOf
and the frozen kMax, so admission and execution can never disagree on
the ladder length.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profile` | `unknown` |

## Returns

  \| [`LadderSpec`](/api/@rulvar/rulvar/interfaces/LadderSpec.md)
  \| `undefined`
