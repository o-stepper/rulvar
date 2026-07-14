[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EvidenceRef

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

Defined in: `packages/core/dist/index.d.ts`

entryRef is the journal entry seq (canonical EntryRef; XF ruling).
