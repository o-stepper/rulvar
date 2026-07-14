[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DedupNote

# Interface: DedupNote

Defined in: [packages/core/src/journal/reuse.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L58)

Telemetry for a SpawnKey match admitted fresh.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-donornodeid"></a> `donorNodeId` | `string` | [packages/core/src/journal/reuse.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L60) |
| <a id="property-reason"></a> `reason` | `"donor_failed"` \| `"no_paid_entries"` \| `"graft_unsafe"` \| `"donor_active"` | [packages/core/src/journal/reuse.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L61) |
| <a id="property-spawnkey"></a> `spawnKey` | `string` | [packages/core/src/journal/reuse.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L59) |
