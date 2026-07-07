---
'@lurker/core': minor
---

M4-T06 versioned price table and M4-T07 per-provider concurrency keys.

- `model/pricing.ts`: `PriceTable { pricingVersion, models }` configured
  via `createEngine({ pricing })`. The table wins over adapter-reported
  `caps.pricing` (a fallback only); unpriced models keep surfacing in
  CostReport, never as a silent zero. Engine-written `model.fallback`
  decision entries pin the active `pricingVersion` so replayed cost
  attribution is stable against later table bumps; a price update is a
  registry update with a version bump, never a caps refresh side effect
  (`refreshCaps()` remains the adapter-level caps path).
- `model/concurrency.ts`: `KeyedLimiter`, engine-scoped, configured via
  `createEngine({ concurrency: { perProvider } })` per adapter id. The
  Appendix A default stays unlimited: the per-run semaphore remains the
  only default bound and provider 429s ride RetryPolicy. When
  configured, every wire dispatch (retries and failover re-acquire)
  gates under its serving adapter's key, adapters throttle
  independently, and queueing surfaces as agent:queued telemetry with
  the provider key. There is deliberately no distributed cross-process
  limiter (docs/14).
