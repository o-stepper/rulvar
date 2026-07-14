[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / LedgerOp

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
  polarity?: "strength" | "weakness";
  subject?: {
     effort?: Effort;
     model: string;
  };
  taskClass: string;
  tierObserved?: number;
  trigger?: KbProposalTrigger;
};
```

Defined in: [packages/plan/src/ledger.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L26)

The CLOSED authored op vocabulary.

## Union Members

### Type Literal

```ts
{
  op: "brief_set";
  text: string;
}
```

***

### Type Literal

```ts
{
  confidence: "low" | "medium" | "high";
  factId: string;
  op: "fact_add";
  provenance: EntryRef[];
  text: string;
}
```

***

### Type Literal

```ts
{
  confidence: "low" | "medium" | "high";
  factId: string;
  op: "fact_supersede";
  provenance: EntryRef[];
  supersededBy: string;
  text: string;
}
```

***

### Type Literal

```ts
{
  key: {
     approachSig: string;
     logicalTaskId: LogicalTaskId;
  };
  op: "lesson_add";
  text: string;
}
```

***

### Type Literal

```ts
{
  evidenceRefs: EntryRef[];
  logicalTaskId: LogicalTaskId;
  note: string;
  op: "observation_add";
  outcomeClass?: string;
  polarity?: "strength" | "weakness";
  subject?: {
     effort?: Effort;
     model: string;
  };
  taskClass: string;
  tierObserved?: number;
  trigger?: KbProposalTrigger;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `evidenceRefs` | [`EntryRef`](/api/@rulvar/rulvar/type-aliases/EntryRef.md)[] | - | [packages/plan/src/ledger.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L51) |
| `logicalTaskId` | [`LogicalTaskId`](/api/@rulvar/rulvar/type-aliases/LogicalTaskId.md) | - | [packages/plan/src/ledger.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L47) |
| `note` | `string` | - | [packages/plan/src/ledger.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L50) |
| `op` | `"observation_add"` | - | [packages/plan/src/ledger.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L45) |
| `outcomeClass?` | `string` | - | [packages/plan/src/ledger.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L49) |
| `polarity?` | `"strength"` \| `"weakness"` | - | [packages/plan/src/ledger.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L61) |
| `subject?` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `model`: `string`; \} | ENGINE-resolved kb_propose payload (phase 3): present exactly when the op was born from the kb_propose tool, whose handler resolves the tier-relative subject against the lineage's declared ladder. The model-facing ledger_append vocabulary never exposes these fields, so an orchestrator cannot forge a subject model name. | [packages/plan/src/ledger.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L60) |
| `subject.effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | [packages/plan/src/ledger.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L60) |
| `subject.model` | `string` | - | [packages/plan/src/ledger.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L60) |
| `taskClass` | `string` | - | [packages/plan/src/ledger.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L46) |
| `tierObserved?` | `number` | - | [packages/plan/src/ledger.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L48) |
| `trigger?` | [`KbProposalTrigger`](/api/@rulvar/rulvar/type-aliases/KbProposalTrigger.md) | - | [packages/plan/src/ledger.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L62) |
