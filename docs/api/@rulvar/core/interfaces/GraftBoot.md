[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GraftBoot

# Interface: GraftBoot

Defined in: [packages/core/src/journal/reuse.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L48)

Graft bootstrap payload (docs/03, 9.9).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-checkpointref"></a> `checkpointRef?` | `string` | Retained by the abandon entry, when it was. | [packages/core/src/journal/reuse.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L50) |
| <a id="property-eligiblepaidusd"></a> `eligiblePaidUsd` | `number` | Deterministic sum of match-eligible payments. | [packages/core/src/journal/reuse.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L52) |
| <a id="property-worktreepinned"></a> `worktreePinned` | `boolean` | - | [packages/core/src/journal/reuse.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L53) |
