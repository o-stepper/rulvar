[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ClaimContradictionFinding

# Interface: ClaimContradictionFinding

Defined in: `packages/core/dist/index.d.ts`

One judged contradiction: the pair plus the judge's one-sentence reason.

## Extends

- [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-anchor"></a> `anchor` | `string` | The draft-side citation verbatim, e.g. 'src/exec.ts:256-296'. | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md).[`anchor`](/api/@rulvar/rulvar/interfaces/ClaimPair.md#property-anchor) | `packages/core/dist/index.d.ts` |
| <a id="property-draftexcerpt"></a> `draftExcerpt` | `string` | The citing draft sentence, collapsed and cut like the readings. | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md).[`draftExcerpt`](/api/@rulvar/rulvar/interfaces/ClaimPair.md#property-draftexcerpt) | `packages/core/dist/index.d.ts` |
| <a id="property-pool"></a> `pool` | [`ClaimPoolReading`](/api/@rulvar/rulvar/interfaces/ClaimPoolReading.md)[] | The pool sentences citing an intersecting span, first-seen order. | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md).[`pool`](/api/@rulvar/rulvar/interfaces/ClaimPair.md#property-pool) | `packages/core/dist/index.d.ts` |
| <a id="property-reason"></a> `reason` | `string` | - | - | `packages/core/dist/index.d.ts` |
