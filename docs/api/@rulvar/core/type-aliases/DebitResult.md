[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DebitResult

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

Defined in: [packages/core/src/journal/termination.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L70)
