[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimContradictionFinding

# Interface: ClaimContradictionFinding

Defined in: [packages/core/src/orchestrator/orchestrate.ts:1022](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1022)

One judged contradiction: the pair plus the judge's one-sentence reason.

## Extends

- [`ClaimPair`](/api/@rulvar/core/interfaces/ClaimPair.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-anchor"></a> `anchor` | `string` | The draft-side citation verbatim, e.g. 'src/exec.ts:256-296'. | [`ClaimPair`](/api/@rulvar/core/interfaces/ClaimPair.md).[`anchor`](/api/@rulvar/core/interfaces/ClaimPair.md#property-anchor) | [packages/core/src/orchestrator/consistency.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L59) |
| <a id="property-draftexcerpt"></a> `draftExcerpt` | `string` | The citing draft sentence, collapsed and cut like the readings. | [`ClaimPair`](/api/@rulvar/core/interfaces/ClaimPair.md).[`draftExcerpt`](/api/@rulvar/core/interfaces/ClaimPair.md#property-draftexcerpt) | [packages/core/src/orchestrator/consistency.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L61) |
| <a id="property-pool"></a> `pool` | [`ClaimPoolReading`](/api/@rulvar/core/interfaces/ClaimPoolReading.md)[] | The pool sentences citing an intersecting span, first-seen order. | [`ClaimPair`](/api/@rulvar/core/interfaces/ClaimPair.md).[`pool`](/api/@rulvar/core/interfaces/ClaimPair.md#property-pool) | [packages/core/src/orchestrator/consistency.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L63) |
| <a id="property-reason"></a> `reason` | `string` | - | - | [packages/core/src/orchestrator/orchestrate.ts:1023](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1023) |
