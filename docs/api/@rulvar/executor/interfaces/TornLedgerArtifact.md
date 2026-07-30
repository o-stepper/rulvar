[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / TornLedgerArtifact

# Interface: TornLedgerArtifact

Defined in: [packages/executor/src/ledger.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L234)

A torn fragment the writer quarantined while repairing a tail (RV502).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-bytes"></a> `bytes` | `string` | The torn fragment as a LOSSY string: invalid UTF-8 bytes decode to U+FFFD, so two different byte tails can read identically here. Kept for compatibility with rows written before RV707; use `bytesBase64` for the exact bytes. | [packages/executor/src/ledger.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L241) |
| <a id="property-bytesbase64"></a> `bytesBase64?` | `string` | The exact torn bytes, base64 (RV707); absent on rows written before it. | [packages/executor/src/ledger.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L243) |
| <a id="property-recoveredat"></a> `recoveredAt` | `number` | Wall-clock ms when the writer quarantined the fragment. | [packages/executor/src/ledger.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L247) |
| <a id="property-sha256"></a> `sha256?` | `string` | sha256 (hex) of the exact torn bytes (RV707); absent on legacy rows. | [packages/executor/src/ledger.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L245) |
