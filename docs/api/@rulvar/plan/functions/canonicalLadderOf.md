[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / canonicalLadderOf

# Function: canonicalLadderOf()

```ts
function canonicalLadderOf(profile): 
  | CanonicalLadderSpec
  | undefined;
```

Defined in: [packages/plan/src/ladder.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L49)

Canonicalizes the profile's declared ladder once per dispatch site.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profile` | `unknown` |

## Returns

  \| [`CanonicalLadderSpec`](/api/@rulvar/rulvar/interfaces/CanonicalLadderSpec.md)
  \| `undefined`
