[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GraftBoot

# Interface: GraftBoot

Defined in: [packages/core/src/journal/reuse.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L49)

Graft bootstrap payload.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-checkpointref"></a> `checkpointRef?` | `string` | Retained by the abandon entry, when it was. | [packages/core/src/journal/reuse.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L51) |
| <a id="property-eligiblepaidusd"></a> `eligiblePaidUsd` | `number` | Deterministic sum of match-eligible payments. | [packages/core/src/journal/reuse.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L53) |
| <a id="property-worktreepinned"></a> `worktreePinned` | `boolean` | - | [packages/core/src/journal/reuse.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L54) |
