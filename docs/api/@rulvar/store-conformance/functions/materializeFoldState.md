[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / materializeFoldState

# Function: materializeFoldState()

```ts
function materializeFoldState(entries): Record<string, unknown>;
```

Defined in: [packages/store-conformance/src/fixtures/golden-fold.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/fixtures/golden-fold.ts#L113)

Materializes the observable fold state of a journal: ref-entry
classifications (invalid details excluded: validator message wording is
not contractual), suspension states, and per-seq abandon coverage.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

`Record`\&lt;`string`, `unknown`\&gt;
