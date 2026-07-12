[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / LEGACY\_SIGNATURE\_INPUTS

# Variable: LEGACY\_SIGNATURE\_INPUTS

```ts
const LEGACY_SIGNATURE_INPUTS: ApproachSignatureInputs;
```

Defined in: [packages/core/src/journal/lineage.ts:225](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L225)

The deterministic signature inputs assigned to legacy spawns (journals
written before lineage existed) and to attempts whose producers did not
record signature inputs: stable constants, never wall-clock, so replay
canonizes identically on every engine (docs/03, 10.7).
