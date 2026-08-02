[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimPair

# Interface: ClaimPair

Defined in: [packages/core/src/orchestrator/consistency.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L57)

One draft assertion paired with the pool readings of its anchor.

## Extended by

- [`ClaimContradictionFinding`](/api/@rulvar/core/interfaces/ClaimContradictionFinding.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-anchor"></a> `anchor` | `string` | The draft-side citation verbatim, e.g. 'src/exec.ts:256-296'. | [packages/core/src/orchestrator/consistency.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L59) |
| <a id="property-draftexcerpt"></a> `draftExcerpt` | `string` | The citing draft sentence, collapsed and cut like the readings. | [packages/core/src/orchestrator/consistency.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L61) |
| <a id="property-pool"></a> `pool` | [`ClaimPoolReading`](/api/@rulvar/core/interfaces/ClaimPoolReading.md)[] | The pool sentences citing an intersecting span, first-seen order. | [packages/core/src/orchestrator/consistency.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L63) |
