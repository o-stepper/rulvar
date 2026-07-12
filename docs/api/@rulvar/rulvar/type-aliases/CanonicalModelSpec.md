[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CanonicalModelSpec

# Type Alias: CanonicalModelSpec

```ts
type CanonicalModelSpec = 
  | {
  effort?: Effort;
  kind: "model";
  model: ModelRef;
}
  | {
  kind: "ladder";
  ladder: CanonicalLadderSpec;
};
```

Defined in: `packages/core/dist/index.d.ts`

Identity-facing canonical form of a RESOLVED model request; the value
that enters AgentIdentityInput.modelSpec.
providerOptions and fallbacks NEVER enter this form: they are
delivery options, excluded from identity exactly like label, phase,
onError, retry, and replay. `effort` is absent exactly when no layer of
the chain and no role effort default resolves one.
