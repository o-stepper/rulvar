[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ClaimPair

# Interface: ClaimPair

Defined in: `packages/core/dist/index.d.ts`

One draft assertion paired with the pool readings of its anchor.

## Extended by

- [`ClaimContradictionFinding`](/api/@rulvar/rulvar/interfaces/ClaimContradictionFinding.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-anchor"></a> `anchor` | `string` | The draft-side citation verbatim, e.g. 'src/exec.ts:256-296'. | `packages/core/dist/index.d.ts` |
| <a id="property-draftexcerpt"></a> `draftExcerpt` | `string` | The citing draft sentence, collapsed and cut like the readings. | `packages/core/dist/index.d.ts` |
| <a id="property-pool"></a> `pool` | [`ClaimPoolReading`](/api/@rulvar/rulvar/interfaces/ClaimPoolReading.md)[] | The pool sentences citing an intersecting span, first-seen order. | `packages/core/dist/index.d.ts` |
