[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EvidenceRef

# Type Alias: EvidenceRef

```ts
type EvidenceRef = 
  | {
  entryRef: number;
  kind: "journal";
  runId: string;
}
  | {
  caseIds: string[];
  kind: "eval";
  reportId: string;
};
```

Defined in: [packages/core/src/l0/spi/knowledge.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L38)

entryRef is the journal entry seq (canonical EntryRef; XF ruling).
