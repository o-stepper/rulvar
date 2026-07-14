[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / foldLedger

# Function: foldLedger()

```ts
function foldLedger(entries, options?): LedgerView;
```

Defined in: [packages/plan/src/ledger.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L127)

Fold every ledger.op plus the auto-derived joins up to `uptoSeq`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `options?` | \{ `ledgerScope?`: `string`; `planScope?`: `string`; `uptoSeq?`: `number`; \} |
| `options.ledgerScope?` | `string` |
| `options.planScope?` | `string` |
| `options.uptoSeq?` | `number` |

## Returns

[`LedgerView`](/api/@rulvar/plan/interfaces/LedgerView.md)
