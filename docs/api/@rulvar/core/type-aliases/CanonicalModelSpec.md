[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CanonicalModelSpec

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

Defined in: [packages/core/src/l0/messages.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L216)

Identity-facing canonical form of a RESOLVED model request; the value
that enters AgentIdentityInput.modelSpec (docs/03, section "Identity
model"). providerOptions and fallbacks NEVER enter this form: they are
delivery options, excluded from identity exactly like label, phase,
onError, retry, and replay. `effort` is absent exactly when no layer of
the chain and no role effort default resolves one (docs/04, section
"Router and resolution chain").
