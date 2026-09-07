[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EvidenceCategory

# Type Alias: EvidenceCategory

```ts
type EvidenceCategory = "implementation" | "tests" | "docs" | "examples";
```

Defined in: [packages/core/src/runtime/evidence-categories.ts:9](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/evidence-categories.ts#L9)

The evidence source categories a contract can distribute over
(RV4908, the tenth comparison experiment): the task demanded
citations across implementation, tests, documentation, and examples,
the contract could say only `minEntries`, the specialists cited
documentation alone, and the judge took the points. The default
classifier reads the recorded file's path; a contract may replace it.
