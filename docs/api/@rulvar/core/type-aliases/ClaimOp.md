[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimOp

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

Defined in: [packages/core/src/l0/spi/knowledge.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L117)

## Union Members

### Type Literal

```ts
{
  claim: ModelClaim;
  gate: GateRecord;
  op: "add";
}
```

***

### Type Literal

```ts
{
  by: ModelClaim;
  claimId: string;
  gate: GateRecord;
  op: "supersede";
}
```

***

### Type Literal

```ts
{
  claimId: string;
  op: "archive";
  reason: "deprecated" | "stale" | "rejected" | "falsified";
}
```

***

### Type Literal

```ts
{
  claimId: string;
  op: "mark_stale";
  reason: "canary-drift";
}
```

Canary maintenance (docs/05, section "Grounding and decay"; added
during M11-T04): fingerprint drift flips eval claims to 'stale'.
Idempotent on already-stale claims; gate-free like archive.
