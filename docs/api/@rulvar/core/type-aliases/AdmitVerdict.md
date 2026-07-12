[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmitVerdict

# Type Alias: AdmitVerdict

```ts
type AdmitVerdict = 
  | {
  dedup?: DedupNote;
  kind: "admit";
  lineage: AdmitLineage;
  reserve: BudgetReserve;
  spawnUnitsAfter: number;
}
  | {
  donor: DonorRef;
  kind: "reuse_full";
  lineage: AdmitLineage & {
     isNew: false;
  };
  spawnUnitsAfter: number;
}
  | {
  boot: GraftBoot;
  donor: DonorRef;
  kind: "admit_graft";
  lineage: AdmitLineage;
  reserve: BudgetReserve;
  spawnUnitsAfter: number;
}
  | {
  kind: "reject";
  reason: AdmitRejectReason;
};
```

Defined in: [packages/core/src/orchestrator/admission.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L68)

The unified admission verdict (XF-11). One union,
closed now; every debit is atomic with its carrying decision entry and
embeds the balance-after (DEF-2).
