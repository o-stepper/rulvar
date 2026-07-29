[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / EffectLedgerScan

# Interface: EffectLedgerScan

Defined in: [packages/executor/src/ledger.ts:249](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L249)

What [loadEffectLedger](/api/@rulvar/executor/functions/loadEffectLedger.md) reads back from a JSONL ledger file.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-corrupt"></a> `corrupt` | [`CorruptLedgerLine`](/api/@rulvar/executor/interfaces/CorruptLedgerLine.md)[] | Lines the scan refused to admit (RV607): unparseable interior bytes, invalid UTF-8, non-object JSON, a missing or mistyped required field, or an unknown phase. Populated only under `tolerateCorrupt` (the default scan throws [LedgerCorruptionError](/api/@rulvar/executor/classes/LedgerCorruptionError.md) instead). Empty on a healthy file. | [packages/executor/src/ledger.ts:272](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L272) |
| <a id="property-intents"></a> `intents` | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md)[] | - | [packages/executor/src/ledger.ts:250](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L250) |
| <a id="property-orphanedintents"></a> `orphanedIntents` | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md)[] | The reconciliation signal (RV501): every intent whose OWN attempt never got an outcome row. Pairing is exact: an outcome resolves the intent carrying the same `attemptId` (rows written before the id shipped pair by the legacy (idempotencyKey, startedAt) join), and an outcome of ANY class resolves only its own attempt. A sibling retry's outcome, ok or error, says nothing about THIS attempt, so it never clears it: closing the logical key belongs to the host reconciler, against the effect provider's receipt. For each orphan, look the key up with the effect's provider before retrying or compensating. | [packages/executor/src/ledger.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L264) |
| <a id="property-outcomes"></a> `outcomes` | [`ToolEffectRecord`](/api/@rulvar/executor/interfaces/ToolEffectRecord.md)[] | - | [packages/executor/src/ledger.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L251) |
| <a id="property-tornartifacts"></a> `tornArtifacts` | [`TornLedgerArtifact`](/api/@rulvar/executor/interfaces/TornLedgerArtifact.md)[] | Fragments the writer quarantined while repairing torn tails (RV502). | [packages/executor/src/ledger.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L274) |
| <a id="property-torntail"></a> `tornTail?` | \{ `preview`: `string`; \} | A live unterminated, unparseable trailing fragment: the artifact of a crash mid-write no writer has repaired yet. Tolerated and named, never silent. (An unterminated line that PARSES but fails the shape is corruption instead: a torn prefix of the writer's own flat record can never parse, so such a line is foreign, not a crash artifact.) | [packages/executor/src/ledger.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L283) |
| `tornTail.preview` | `string` | - | [packages/executor/src/ledger.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L283) |
