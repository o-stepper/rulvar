[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionTicketDecision

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

Defined in: [packages/core/src/l0/spi/admission.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L110)
