[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / LedgerOp

# Type Alias: LedgerOp

```ts
type LedgerOp = 
  | {
  op: "brief_set";
  text: string;
}
  | {
  confidence: "low" | "medium" | "high";
  factId: string;
  op: "fact_add";
  provenance: EntryRef[];
  text: string;
}
  | {
  confidence: "low" | "medium" | "high";
  factId: string;
  op: "fact_supersede";
  provenance: EntryRef[];
  supersededBy: string;
  text: string;
}
  | {
  key: {
     approachSig: string;
     logicalTaskId: LogicalTaskId;
  };
  op: "lesson_add";
  text: string;
}
  | {
  evidenceRefs: EntryRef[];
  logicalTaskId: LogicalTaskId;
  note: string;
  op: "observation_add";
  outcomeClass?: string;
  taskClass: string;
  tierObserved?: number;
};
```

Defined in: [packages/plan/src/ledger.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L20)

The CLOSED authored op vocabulary (docs/07, 9.2).
