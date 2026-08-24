[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectLookupQualification

# Type Alias: EffectLookupQualification

```ts
type EffectLookupQualification = "acceptance-closing" | "conditional-create";
```

Defined in: [packages/core/src/effects/types.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L33)

What earns a provider the `lookup` row (RFC section 6): either a
negative that provably CLOSES acceptance, or a provider-enforced
unique natural key on create. Recorded on the intent so recovery
policy is derivable from the journal alone.
