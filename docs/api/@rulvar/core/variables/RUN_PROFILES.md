[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RUN\_PROFILES

# Variable: RUN\_PROFILES

```ts
const RUN_PROFILES: Record<string, RunProfile>;
```

Defined in: [packages/core/src/engine/run-profiles.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-profiles.ts#L37)

The shipped presets (docs/06, section 11: fast / standard / deep /
ultra "and similar"). Data only; a review-time assertion checks the
engine has zero behavioral branches keyed on these names.
