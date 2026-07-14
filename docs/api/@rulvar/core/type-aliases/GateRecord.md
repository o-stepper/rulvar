[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GateRecord

# Type Alias: GateRecord

```ts
type GateRecord = 
  | {
  approver: string;
  at: string;
  attribution: {
     contrastEvidence?: EvidenceRef;
     ruledOut: ("prompt" | "tools" | "difficulty" | "transient-provider")[];
  };
  kind: "human";
}
  | {
  committerId: string;
  kind: "eval-committer";
  reportId: string;
}
  | {
  kind: "eval-confirmed";
  n: number;
  passRate: number;
  reportId: string;
};
```

Defined in: [packages/core/src/l0/spi/knowledge.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L98)

The write gate. The human variant carries the MANDATORY attribution
attestation (ruledOut over the checklist prompt, tools, difficulty,
transient-provider; recommended contrast evidence): rubber-stamping
"evidence exists" is constructively impossible. The eval-confirmed
variant is reserved for v2, outside the committed roadmap.

## Union Members

### Type Literal

```ts
{
  approver: string;
  at: string;
  attribution: {
     contrastEvidence?: EvidenceRef;
     ruledOut: ("prompt" | "tools" | "difficulty" | "transient-provider")[];
  };
  kind: "human";
}
```

***

### Type Literal

```ts
{
  committerId: string;
  kind: "eval-committer";
  reportId: string;
}
```

The dedicated committer identity (M11): the
ONLY gate under which eval-measured claims and the metrics block
commit. Coherence is schema-enforced in both directions.

***

### Type Literal

```ts
{
  kind: "eval-confirmed";
  n: number;
  passRate: number;
  reportId: string;
}
```

Reserved for v2: the proposal auto-gate, NOT the committer identity.
