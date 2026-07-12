[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CanonicalId

# Type Alias: CanonicalId

```ts
type CanonicalId = string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Engine-minted ULID identifying a tool call across providers. The library,
not the provider, mints tool-call ids; each adapter keeps a bijective map
between canonical ids and wire ids (toolu_* / call_*) in both directions
(docs/04, section "Canonical tool-call ids").
