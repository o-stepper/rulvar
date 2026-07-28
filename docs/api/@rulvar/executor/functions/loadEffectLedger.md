[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / loadEffectLedger

# Function: loadEffectLedger()

```ts
function loadEffectLedger(path): Promise<EffectLedgerScan>;
```

Defined in: [packages/executor/src/ledger.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L61)

Scans a JSONL ledger file into intents, outcomes, and the orphaned
intents a host must reconcile. A torn trailing line (the artifact of
a crash mid-write) is skipped, never a scan failure: the durable rows
before it are exactly what reconciliation needs.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

## Returns

`Promise`\&lt;[`EffectLedgerScan`](/api/@rulvar/executor/interfaces/EffectLedgerScan.md)\&gt;
