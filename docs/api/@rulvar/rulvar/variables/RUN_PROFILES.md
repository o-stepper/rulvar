[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RUN\_PROFILES

# Variable: RUN\_PROFILES

```ts
const RUN_PROFILES: Record<string, RunProfile>;
```

Defined in: `packages/core/dist/index.d.ts`

The shipped presets (fast / standard / deep / ultra "and similar").
Data only; a review-time assertion checks the
engine has zero behavioral branches keyed on these names.
