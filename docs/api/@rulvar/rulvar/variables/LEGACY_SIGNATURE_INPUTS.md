[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / LEGACY\_SIGNATURE\_INPUTS

# Variable: LEGACY\_SIGNATURE\_INPUTS

```ts
const LEGACY_SIGNATURE_INPUTS: ApproachSignatureInputs;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The deterministic signature inputs assigned to legacy spawns (journals
written before lineage existed) and to attempts whose producers did not
record signature inputs: stable constants, never wall-clock, so replay
canonizes identically on every engine (docs/03, 10.7).
