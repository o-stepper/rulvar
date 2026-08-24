[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionRecovery

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

Defined in: [packages/core/src/l0/spi/admission.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L116)

The recovery answer for a resumed unit (RFC section 4, item 5).
