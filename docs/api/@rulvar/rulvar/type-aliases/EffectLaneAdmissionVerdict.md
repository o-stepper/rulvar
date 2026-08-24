[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectLaneAdmissionVerdict

# Type Alias: EffectLaneAdmissionVerdict

```ts
type EffectLaneAdmissionVerdict = 
  | {
  ok: true;
}
  | {
  conjunct:   | "settled"
     | "status"
     | "completion"
     | "deliverableAccepted"
     | "productionAcceptable";
  ok: false;
  reason: string;
};
```

Defined in: `packages/core/dist/index.d.ts`
