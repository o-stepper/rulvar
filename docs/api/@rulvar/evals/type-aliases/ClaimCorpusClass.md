[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / ClaimCorpusClass

# Type Alias: ClaimCorpusClass

```ts
type ClaimCorpusClass = 
  | "live-fact"
  | "package-identity"
  | "inverted-default"
  | "numeric-range"
  | "negation"
  | "bounded-coverage"
  | "modality-overclaim"
  | "scope-ambiguity";
```

Defined in: [packages/evals/src/claim-corpus.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L44)

The failure classes the eighteenth benchmark shipped, plus the bound
classes, plus the nineteenth benchmark's pair (RV1809):
'modality-overclaim' is a mitigation stated as an unconditional
guarantee, and 'scope-ambiguity' is a child-only total printed as a
whole-workflow figure.
