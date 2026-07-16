[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / ANTHROPIC\_PRICING

# Variable: ANTHROPIC\_PRICING

```ts
const ANTHROPIC_PRICING: PriceTable;
```

Defined in: [packages/anthropic/src/caps.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/caps.ts#L144)

The seed pricing rows as a versioned price table, keyed by full
ModelRef under the adapter's fixed id 'anthropic'. Pass it to
createEngine({ pricing }) so the run journals a concrete
pricingVersion instead of 'unpriced': the versioned table wins over
the caps fallback by rule, and a later table revision surfaces as
explicit configuration drift on resume rather than a silent
reinterpretation. Extend or override rows by spreading `models` into
your own table with a new version string (the documented path for the
Sonnet 5 promotion ending on 2026-08-31).
