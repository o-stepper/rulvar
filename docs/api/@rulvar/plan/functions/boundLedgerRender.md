[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / boundLedgerRender

# Function: boundLedgerRender()

```ts
function boundLedgerRender(view, budgetChars?): LedgerView;
```

Defined in: [packages/plan/src/ledger.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L245)

Deterministic render bound (docs/07, 9.3): over budget, rows drop
oldest-first, auto-derived joins before authored sections, and the
mission brief slices last; every drop is a FLAGGED discrepancy line.
A pure function of (view, budget): a re-executed wake turn renders
byte-identical bounded bytes from the same pinned fold.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `view` | [`LedgerView`](/api/@rulvar/plan/interfaces/LedgerView.md) | `undefined` |
| `budgetChars` | `number` | `LEDGER_RENDER_BUDGET_CHARS` |

## Returns

[`LedgerView`](/api/@rulvar/plan/interfaces/LedgerView.md)
