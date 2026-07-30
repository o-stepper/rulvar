[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / CorruptLedgerLine

# Interface: CorruptLedgerLine

Defined in: [packages/executor/src/ledger.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L221)

One malformed line of the ledger file, surfaced for triage.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-line"></a> `line` | `number` | 1-based physical line number in the file. | [packages/executor/src/ledger.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L223) |
| <a id="property-offset"></a> `offset` | `number` | Byte offset of the line's first byte within the file. | [packages/executor/src/ledger.ts:225](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L225) |
| <a id="property-preview"></a> `preview` | `string` | The first 120 characters of the line (lossy-decoded when the bytes are not valid UTF-8; the hash pins the exact bytes). | [packages/executor/src/ledger.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L230) |
| <a id="property-sha256"></a> `sha256` | `string` | sha256 (hex) of the raw line bytes: forensics without re-reading. | [packages/executor/src/ledger.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L227) |
