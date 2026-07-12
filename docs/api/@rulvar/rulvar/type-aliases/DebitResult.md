[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DebitResult

# Type Alias: DebitResult

```ts
type DebitResult = 
  | {
  balanceAfter: number;
  ok: true;
}
  | {
  deniedEntryRef: EntryRef;
  ok: false;
  resource: TerminationResource;
};
```

Defined in: `packages/core/dist/index.d.ts`
