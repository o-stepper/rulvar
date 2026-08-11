---
'@rulvar/core': minor
---

`strictPricing` enforces the presence the `Pricing` type promises (RV3204). The gate's rate checks were conditional on each field being present, so an untyped or JSON-loaded `{}` price row satisfied all of them and the downstream fold priced it at a zero debit: a "strictly priced" dispatch that debited nothing against every ceiling. Under `strictPricing` a resolved row must now CARRY finite non-negative `inputUsdPerMTok` and `outputUsdPerMTok`; a missing rate refuses typed before the wire, naming the field, with `allowUnpriced` unchanged as the explicit exception. Cache rates and long-context tiers stay optional exactly as the type declares them, and rows that already satisfied the type are byte identical.
