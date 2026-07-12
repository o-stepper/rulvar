[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / LEDGER\_RENDER\_BUDGET\_CHARS

# Variable: LEDGER\_RENDER\_BUDGET\_CHARS

```ts
const LEDGER_RENDER_BUDGET_CHARS: 65536 = 65536;
```

Defined in: [packages/plan/src/ledger.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L236)

The committed ledger_read render budget (Appendix A: 65536
chars over the serialized view, the character measure; OQ-04 closed
at M10 entry). The section caps stay the primary bound; under the
default termination limits this belt never engages.
