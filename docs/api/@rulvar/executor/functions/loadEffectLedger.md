[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / loadEffectLedger

# Function: loadEffectLedger()

```ts
function loadEffectLedger(path, options?): Promise<EffectLedgerScan>;
```

Defined in: [packages/executor/src/ledger.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L190)

Scans a JSONL ledger file into intents, outcomes, and the orphaned
intents a host must reconcile, pairing attempts exactly (RV501). A
torn TRAILING fragment (the crash-mid-write artifact) is tolerated
and reported; an unparseable INTERIOR line fails the scan closed with
a typed [LedgerCorruptionError](/api/@rulvar/executor/classes/LedgerCorruptionError.md) unless `tolerateCorrupt` asks
for the lines as data (RV502).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |
| `options?` | \{ `tolerateCorrupt?`: `boolean`; \} |
| `options.tolerateCorrupt?` | `boolean` |

## Returns

`Promise`\&lt;[`EffectLedgerScan`](/api/@rulvar/executor/interfaces/EffectLedgerScan.md)\&gt;
