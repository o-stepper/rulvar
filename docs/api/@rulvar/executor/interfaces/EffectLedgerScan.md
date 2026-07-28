[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / EffectLedgerScan

# Interface: EffectLedgerScan

Defined in: [packages/executor/src/ledger.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L150)

What [loadEffectLedger](/api/@rulvar/executor/functions/loadEffectLedger.md) reads back from a JSONL ledger file.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-corrupt"></a> `corrupt` | [`CorruptLedgerLine`](/api/@rulvar/executor/interfaces/CorruptLedgerLine.md)[] | Unparseable interior lines, populated only under `tolerateCorrupt` (the default scan throws [LedgerCorruptionError](/api/@rulvar/executor/classes/LedgerCorruptionError.md) instead). Empty on a healthy file. | [packages/executor/src/ledger.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L171) |
| <a id="property-intents"></a> `intents` | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md)[] | - | [packages/executor/src/ledger.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L151) |
| <a id="property-orphanedintents"></a> `orphanedIntents` | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md)[] | The reconciliation signal (RV501): every intent whose OWN attempt never got an outcome row. Pairing is exact: an outcome resolves the intent carrying the same `attemptId` (rows written before the id shipped pair by the legacy (idempotencyKey, startedAt) join), and an outcome of ANY class resolves only its own attempt. A sibling retry's outcome, ok or error, says nothing about THIS attempt, so it never clears it: closing the logical key belongs to the host reconciler, against the effect provider's receipt. For each orphan, look the key up with the effect's provider before retrying or compensating. | [packages/executor/src/ledger.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L165) |
| <a id="property-outcomes"></a> `outcomes` | [`ToolEffectRecord`](/api/@rulvar/executor/interfaces/ToolEffectRecord.md)[] | - | [packages/executor/src/ledger.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L152) |
| <a id="property-tornartifacts"></a> `tornArtifacts` | [`TornLedgerArtifact`](/api/@rulvar/executor/interfaces/TornLedgerArtifact.md)[] | Fragments the writer quarantined while repairing torn tails (RV502). | [packages/executor/src/ledger.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L173) |
| <a id="property-torntail"></a> `tornTail?` | \{ `preview`: `string`; \} | A live unterminated, unparseable trailing fragment: the artifact of a crash mid-write no writer has repaired yet. Tolerated and named, never silent. | [packages/executor/src/ledger.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L179) |
| `tornTail.preview` | `string` | - | [packages/executor/src/ledger.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L179) |
