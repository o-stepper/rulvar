[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / ledgerSufficiency

# Function: ledgerSufficiency()

```ts
function ledgerSufficiency(view, minimumFacts?): boolean;
```

Defined in: [packages/plan/src/ledger.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ledger.ts#L345)

Compaction sufficiency: the orchestrate role may
compact aggressively only when the ledger measurably suffices (at
least one authored revision recorded and a minimum fact count);
otherwise the engine falls back to conservative summarize.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `view` | [`LedgerView`](/api/@rulvar/plan/interfaces/LedgerView.md) | `undefined` |
| `minimumFacts` | `number` | `3` |

## Returns

`boolean`
