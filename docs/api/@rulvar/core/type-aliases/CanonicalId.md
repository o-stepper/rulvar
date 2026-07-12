[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CanonicalId

# Type Alias: CanonicalId

```ts
type CanonicalId = string;
```

Defined in: [packages/core/src/l0/messages.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L19)

Engine-minted ULID identifying a tool call across providers. The library,
not the provider, mints tool-call ids; each adapter keeps a bijective map
between canonical ids and wire ids (toolu_* / call_*) in both directions.
