[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectLookupQualification

# Type Alias: EffectLookupQualification

```ts
type EffectLookupQualification = "acceptance-closing" | "conditional-create";
```

Defined in: `packages/core/dist/index.d.ts`

What earns a provider the `lookup` row (RFC section 6): either a
negative that provably CLOSES acceptance, or a provider-enforced
unique natural key on create. Recorded on the intent so recovery
policy is derivable from the journal alone.
