[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / CorruptLedgerLine

# Interface: CorruptLedgerLine

Defined in: [packages/executor/src/ledger.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L106)

One unparseable interior line of the ledger file, surfaced for triage.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-line"></a> `line` | `number` | 1-based physical line number in the file. | [packages/executor/src/ledger.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L108) |
| <a id="property-offset"></a> `offset` | `number` | Byte offset of the line's first byte within the file. | [packages/executor/src/ledger.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L110) |
| <a id="property-preview"></a> `preview` | `string` | The first 120 characters of the line. | [packages/executor/src/ledger.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L114) |
| <a id="property-sha256"></a> `sha256` | `string` | sha256 (hex) of the raw line bytes: forensics without re-reading. | [packages/executor/src/ledger.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L112) |
