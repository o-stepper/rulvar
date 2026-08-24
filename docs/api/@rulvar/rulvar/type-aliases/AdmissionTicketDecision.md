[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionTicketDecision

# Type Alias: AdmissionTicketDecision

```ts
type AdmissionTicketDecision = 
  | {
  state: "granted";
  ticket: AdmissionTicket;
}
  | {
  position: number;
  retryAfterMs?: number;
  state: "queued";
  ticket: AdmissionTicket;
}
  | {
  reason: string;
  state: "denied";
};
```

Defined in: `packages/core/dist/index.d.ts`
