[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / TornLedgerArtifact

# Interface: TornLedgerArtifact

Defined in: [packages/executor/src/ledger.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L118)

A torn fragment the writer quarantined while repairing a tail (RV502).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-bytes"></a> `bytes` | `string` | The raw torn bytes, preserved verbatim. | [packages/executor/src/ledger.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L120) |
| <a id="property-recoveredat"></a> `recoveredAt` | `number` | Wall-clock ms when the writer quarantined the fragment. | [packages/executor/src/ledger.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L122) |
