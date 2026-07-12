[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ClaimOp

# Type Alias: ClaimOp

```ts
type ClaimOp = 
  | {
  claim: ModelClaim;
  gate: GateRecord;
  op: "add";
}
  | {
  by: ModelClaim;
  claimId: string;
  gate: GateRecord;
  op: "supersede";
}
  | {
  claimId: string;
  op: "archive";
  reason: "deprecated" | "stale" | "rejected" | "falsified";
}
  | {
  claimId: string;
  op: "mark_stale";
  reason: "canary-drift";
};
```

Defined in: `packages/core/dist/index.d.ts`
