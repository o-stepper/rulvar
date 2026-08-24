[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionRecovery

# Type Alias: AdmissionRecovery

```ts
type AdmissionRecovery = 
  | {
  state: "granted";
  ticket: AdmissionTicket;
}
  | {
  position: number;
  state: "queued";
  ticket: AdmissionTicket;
}
  | {
  state: "unknown";
};
```

Defined in: `packages/core/dist/index.d.ts`

The recovery answer for a resumed unit (RFC section 4, item 5).
