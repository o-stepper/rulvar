[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / OPENAI\_PRICING

# Variable: OPENAI\_PRICING

```ts
const OPENAI_PRICING: PriceTable;
```

Defined in: [packages/openai/src/caps.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/caps.ts#L137)

The seed pricing rows as a versioned price table, keyed by full
ModelRef under the adapter's fixed id 'openai' (long-context tiers
included; the 'gpt-5.6' alias carries the same row as its Sol
target). Pass it to createEngine({ pricing }) so the run journals a
concrete pricingVersion instead of 'unpriced': the versioned table
wins over the caps fallback by rule, and a later table revision
surfaces as explicit configuration drift on resume rather than a
silent reinterpretation.
