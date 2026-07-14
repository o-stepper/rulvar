[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AbandonedSpendView

# Interface: AbandonedSpendView

Defined in: [packages/core/src/journal/reuse.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L119)

The abandoned-spend ledger fold.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-abandonedusd"></a> `abandonedUsd` | `number` | [packages/core/src/journal/reuse.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L120) |
| <a id="property-bykey"></a> `byKey` | `Record`\&lt;[`SpawnKey`](/api/@rulvar/core/type-aliases/SpawnKey.md), \{ `abandonedUsd`: `number`; `oscillationCount`: `number`; `reclaimedUsd`: `number`; \}\&gt; | [packages/core/src/journal/reuse.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L123) |
| <a id="property-netlostusd"></a> `netLostUsd` | `number` | [packages/core/src/journal/reuse.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L122) |
| <a id="property-reclaimedusd"></a> `reclaimedUsd` | `number` | [packages/core/src/journal/reuse.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L121) |
