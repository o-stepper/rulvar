---
'@rulvar/core': minor
'@rulvar/cli': minor
---

Stored consumers compose the pricing pins exactly like the engine, and the invoice provenance declares every pinned version (RV611).

`JournalPricingSnapshot` exports the composition the engine's outcome mirror applies at settle: `composedPriceUsd(current)` prices pin-covered rows at the rates their own settle recorded and everything past the last pin (a segment journaled but never settled) at the caller's current table. The engine now consumes the same method, and the three stored consumers (`rulvar inspect`, `rulvar invoice`, the server's stored-run cost endpoint) fold through it instead of passing the raw snapshot, which silently priced the tail at the last pin's rates and folded never-pinned models as unpriced even when the current table knows them. Two fallbacks stay deliberate and documented: a covered model its covering pin missed back-reprices at the last pin when that pin names it, and a model no pin resolves falls to the current table.

The snapshot also carries `segments` (every pin's seq boundaries, `pricingVersion`, and rows in journal order), and `InvoicePricingProvenance` gains the `'composed'` source plus `segments` and `pinnedThroughSeq`, so an invoice folded across a price-table rotation names every version that priced it instead of hiding the rotation behind the last one. The CLI exports that priced through a pin now declare `source: 'composed'` (previously `'snapshot'`), and the `pricing rates:`/`pricing:` text lines name the composition and every pinned version.
