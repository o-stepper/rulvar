[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / runClaimCorpus

# Function: runClaimCorpus()

```ts
function runClaimCorpus(cases?): ClaimCorpusVerdict[];
```

Defined in: [packages/evals/src/claim-corpus.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L195)

Runs every corpus case through the pure folds and grades the
mechanical expectations. No engine, no model, no journal: the same
functions the orchestrator runs, on the same bytes.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `cases` | readonly [`ClaimCorpusCase`](/api/@rulvar/evals/interfaces/ClaimCorpusCase.md)[] | `CLAIM_CORPUS` |

## Returns

[`ClaimCorpusVerdict`](/api/@rulvar/evals/interfaces/ClaimCorpusVerdict.md)[]
