[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DEFAULT\_MAX\_QUOTA\_DENIALS

# Variable: DEFAULT\_MAX\_QUOTA\_DENIALS

```ts
const DEFAULT_MAX_QUOTA_DENIALS: 8 = 8;
```

Defined in: `packages/core/dist/index.d.ts`

The default [EngineQuotaConfig.maxDenials](/api/@rulvar/rulvar/interfaces/EngineQuotaConfig.md#property-maxdenials): generous next to the
transport default of 3 tries because a denial is a WAIT, not a
failure signal, yet finite because nothing else bounds the pre-wire
loop (the per-agent timeout is checked between turns, not inside a
dispatch).
