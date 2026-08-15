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
  | "scope-ambiguity"
  | "bound-conflation"
  | "derived-premise"
  | "cost-basis";
```

Defined in: [packages/evals/src/claim-corpus.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/claim-corpus.ts#L50)

The failure classes the eighteenth benchmark shipped, plus the bound
classes, plus the nineteenth benchmark's pair (RV1809):
'modality-overclaim' is a mitigation stated as an unconditional
guarantee, and 'scope-ambiguity' is a child-only total printed as a
whole-workflow figure. The third comparison experiment validated
three more (RV3804): 'bound-conflation' lists opt-in caps and
unconditional guards as one mode, 'derived-premise' is a derived
figure whose premise contradicts the declared input (2,000 slots
computed from a 30 minute window where the input declares a 20
minute burst), and 'cost-basis' prints a locally estimated total as
the provider's bill.
