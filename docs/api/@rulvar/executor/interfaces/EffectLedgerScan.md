[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / EffectLedgerScan

# Interface: EffectLedgerScan

Defined in: [packages/executor/src/ledger.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L42)

What [loadEffectLedger](/api/@rulvar/executor/functions/loadEffectLedger.md) reads back from a JSONL ledger file.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-intents"></a> `intents` | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md)[] | - | [packages/executor/src/ledger.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L43) |
| <a id="property-orphanedintents"></a> `orphanedIntents` | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md)[] | The reconciliation signal (RV404): every intent whose idempotency key has NO outcome row at all. A key with a later outcome (an at-least-once retry of the same logical call that completed) is not orphaned: the retry resolved it. For each orphan, look the key up with the effect's provider before retrying or compensating. | [packages/executor/src/ledger.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L52) |
| <a id="property-outcomes"></a> `outcomes` | [`ToolEffectRecord`](/api/@rulvar/executor/interfaces/ToolEffectRecord.md)[] | - | [packages/executor/src/ledger.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L44) |
