---
'@rulvar/anthropic': patch
---

The Anthropic rates stamp is renewed on 2026-09-08 (plan 49, wave C). Every seeded row was re read against the documented model pricing table with the rates audit's own extractor, all five published columns including the 1h cache write premium, and no number moved: `pricingVersion` stays `anthropic-2026-07-31`, every rate is byte identical, and `RATES_VERIFIED_AT`, written into every priced row's `ratesVerifiedAt`, becomes `2026-09-08` so the sixty day age rule of the scheduled audit counts from this renewal. The stamp moves beside the OpenAI table's revision of the same day so both providers renew together, as the renewal ritual in the providers guide describes.
