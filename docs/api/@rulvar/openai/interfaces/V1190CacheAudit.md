[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / V1190CacheAudit

# Interface: V1190CacheAudit

Defined in: [packages/openai/src/audit.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/audit.ts#L50)

One journal's sidecar reconciliation; see auditV1190CacheJournal.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-affectedentries"></a> `affectedEntries` | `number` | Entries whose usage carried the affected shape and were inverted. | [packages/openai/src/audit.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/audit.ts#L52) |
| <a id="property-correctedusd"></a> `correctedUsd` | `number` | The fold with every affected usage inverted to the true wire shape. | [packages/openai/src/audit.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/audit.ts#L56) |
| <a id="property-recordedusd"></a> `recordedUsd` | `number` | The fold as recorded (what reports and budgets saw). | [packages/openai/src/audit.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/audit.ts#L54) |
