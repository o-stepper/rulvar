[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DEFAULT\_MAX\_QUOTA\_DENIALS

# Variable: DEFAULT\_MAX\_QUOTA\_DENIALS

```ts
const DEFAULT_MAX_QUOTA_DENIALS: 8 = 8;
```

Defined in: [packages/core/src/model/quota.ts:533](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L533)

The default [EngineQuotaConfig.maxDenials](/api/@rulvar/core/interfaces/EngineQuotaConfig.md#property-maxdenials): generous next to the
transport default of 3 tries because a denial is a WAIT, not a
failure signal, yet finite because nothing else bounds the pre-wire
loop (the per-agent timeout is checked between turns, not inside a
dispatch).
