[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / GateRecord

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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The write gate. The human variant carries the MANDATORY attribution
attestation (ruledOut over the checklist prompt, tools, difficulty,
transient-provider; recommended contrast evidence): rubber-stamping
"evidence exists" is constructively impossible. The eval-confirmed
variant is reserved for v2, outside the committed roadmap.
