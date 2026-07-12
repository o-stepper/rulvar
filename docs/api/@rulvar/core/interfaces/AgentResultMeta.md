[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentResultMeta

# Interface: AgentResultMeta

Defined in: [packages/core/src/journal/reuse.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L78)

The consumer-facing reuse mark on results (docs/03, 9.9).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-reusedfrom"></a> `reusedFrom?` | \{ `mode`: `"full"` \| `"graft"`; `nodeId`: `string`; `reclaimedUsd`: `number`; `rootEntryRef`: `number`; \} | [packages/core/src/journal/reuse.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L79) |
| `reusedFrom.mode` | `"full"` \| `"graft"` | [packages/core/src/journal/reuse.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L82) |
| `reusedFrom.nodeId` | `string` | [packages/core/src/journal/reuse.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L80) |
| `reusedFrom.reclaimedUsd` | `number` | [packages/core/src/journal/reuse.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L83) |
| `reusedFrom.rootEntryRef` | `number` | [packages/core/src/journal/reuse.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L81) |
