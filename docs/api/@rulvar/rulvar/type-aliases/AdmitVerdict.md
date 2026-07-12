[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmitVerdict

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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The unified admission verdict (docs/07, section 7.2; XF-11). One union,
closed now; every debit is atomic with its carrying decision entry and
embeds the balance-after (DEF-2).
