[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournalPricingSnapshot

# Interface: JournalPricingSnapshot

Defined in: `packages/core/dist/index.d.ts`

What `journalPricingSnapshot` rebuilds from a pinned run settle.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-composedpriceusd"></a> `composedPriceUsd` | (`current`) => (`servedBy`, `usage`, `seq?`) => `number` \| `undefined` | THE composition the engine's outcome mirror applies at settle (RV611), exported so stored consumers (the CLI cost and invoice views, the server cost endpoint) fold exactly like the engine instead of passing the raw snapshot: a pin-covered row (`seq < pinnedThroughSeq`) prices under the pin of its own segment; the tail past the last pin (a segment journaled but not yet settled, the crashed-mid-flight shape) and seq-less calls price at `current` alone, exactly like the live debits that tail will settle with, never silently at the last pin's rates. Two deliberate fallbacks, both documented rather than hidden: a covered model its covering pin missed back-reprices at the LAST pin when that pin names it (the journal never recorded what those debits actually cost), and otherwise falls to `current` (today's table may know a model the run's tables never priced); a model neither names folds as unpriced, surfaced, never a silent zero. | `packages/core/dist/index.d.ts` |
| <a id="property-pinnedthroughseq"></a> `pinnedThroughSeq` | `number` | The seq of the last pinning settle: rows at or past it belong to a segment no pin covers yet, so a caller composing with a live table (the engine's outcome mirror) prefers the live rates there. | `packages/core/dist/index.d.ts` |
| <a id="property-priceusd"></a> `priceUsd` | (`servedBy`, `usage`, `seq?`) => `number` \| `undefined` | Prices usage with the PINNED rows only: a model absent from the snapshot folds as unpriced (surfaced, never a silent zero), exactly the honesty contract of the live fold. With a `seq`, the row is priced under the pin of ITS OWN segment (RV505): the first settle that followed it, which recorded exactly the rates its live debits used, so a suspend/resume across a price-table rotation never re-prices settled history. Without a `seq`, the last pin wins, the historical behavior. | `packages/core/dist/index.d.ts` |
| <a id="property-pricingversion"></a> `pricingVersion?` | `string` | The PriceTable version of the LAST pin; absent for caps-only rows. | `packages/core/dist/index.d.ts` |
| <a id="property-rows"></a> `rows` | [`AppliedPricingRow`](/api/@rulvar/rulvar/interfaces/AppliedPricingRow.md)[] | The last pin's rows: the union covering the whole settled journal. | `packages/core/dist/index.d.ts` |
| <a id="property-segments"></a> `segments` | [`PinnedPricingSegment`](/api/@rulvar/rulvar/interfaces/PinnedPricingSegment.md)[] | Every pin in journal order (RV611): boundaries, versions, and rows, not only the last. This is the honest provenance for a fold across a price-table rotation: consumers exporting `pricingVersion` alone silently hid that different segments priced under different tables. | `packages/core/dist/index.d.ts` |
