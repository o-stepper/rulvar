[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmitRejectReason

# Type Alias: AdmitRejectReason

```ts
type AdmitRejectReason = 
  | {
  code:   | "depth"
     | "quota"
     | "budget"
     | "lifetime"
     | "termination_exhausted"
     | "ladder_exceeds_frozen"
     | "lineage_exhausted"
     | "lineage_busy";
}
  | {
  code: "osc_guard";
  oscillationCount: number;
  spawnKey: SpawnKey;
};
```

Defined in: [packages/core/src/orchestrator/admission.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L93)

The merged reject-code set.
