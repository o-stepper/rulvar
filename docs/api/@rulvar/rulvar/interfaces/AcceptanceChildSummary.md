[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-error"></a> `error?` | \{ `kind`: `string`; `message?`: `string`; `stage?`: `string`; \} | The child's own typed death reason (RV4703), from its settled terminal: present exactly when the child settled carrying an error. The eighth comparison experiment's first run rejected on "child settled 'error'" while the child's terminal named the budget-refused finalize dispatch; the roster is machine readable, so the reason is too. The message is bounded to 200 characters; `stage` names the dispatch a budget refusal killed, when the loop stamped one. | `packages/core/dist/index.d.ts` |
| `error.kind` | `string` | - | `packages/core/dist/index.d.ts` |
| `error.message?` | `string` | - | `packages/core/dist/index.d.ts` |
| `error.stage?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | - | `packages/core/dist/index.d.ts` |
| `evidence.floorRequired?` | `true` | - | `packages/core/dist/index.d.ts` |
| `evidence.met` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `evidence.minEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| `evidence.recordedEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| `evidence.waivedBySalvage?` | `true` | - | `packages/core/dist/index.d.ts` |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | `string` | - | `packages/core/dist/index.d.ts` |
