[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / commitEvalMeasured

# Function: commitEvalMeasured()

```ts
function commitEvalMeasured(
   store, 
   claims, 
options): Promise<number>;
```

Defined in: [packages/evals/src/committer.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L76)

Commits measured claims through the eval-committer gate with the
documented rebase recipe: on a CAS rejection, re-read current() and
retry against the fresh version. Returns the committed version.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `store` | [`ModelKnowledgeStore`](/api/@rulvar/rulvar/interfaces/ModelKnowledgeStore.md) |
| `claims` | readonly [`MeasuredClaimInput`](/api/@rulvar/evals/interfaces/MeasuredClaimInput.md)[] |
| `options` | [`EvalCommitterOptions`](/api/@rulvar/evals/interfaces/EvalCommitterOptions.md) |

## Returns

`Promise`\&lt;`number`\&gt;
