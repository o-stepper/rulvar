[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / ledgerCapViolation

# Function: ledgerCapViolation()

```ts
function ledgerCapViolation(view, op): string | undefined;
```

Defined in: [packages/plan/src/ledger.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L320)

Section-cap check for one authored op (Appendix A).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `view` | [`LedgerView`](/api/@rulvar/plan/interfaces/LedgerView.md) |
| `op` | [`LedgerOp`](/api/@rulvar/plan/type-aliases/LedgerOp.md) |

## Returns

`string` \| `undefined`
