[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FUTURE\_RATES\_TOLERANCE\_MS

# Variable: FUTURE\_RATES\_TOLERANCE\_MS

```ts
const FUTURE_RATES_TOLERANCE_MS: 86400000 = 86_400_000;
```

Defined in: [packages/core/src/engine/budget.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L61)

How far a `ratesVerifiedAt` may sit in the future before strict
pricing refuses it (RV1804): one day absorbs date-only strings
authored ahead of UTC and ordinary clock skew, while a typo'd year
(the hazard the clamp exists for) is months out and refuses.
