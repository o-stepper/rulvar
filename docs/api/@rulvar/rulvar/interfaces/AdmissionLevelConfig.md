[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionLevelConfig

# Interface: AdmissionLevelConfig

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-algorithm"></a> `algorithm` | `"sliding-window"` \| `"token-bucket"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-capwires"></a> `capWires` | `number` | Total wires capacity: the feasibility bound and the cap. | `packages/core/dist/index.d.ts` |
| <a id="property-concurrency"></a> `concurrency?` | `number` | Level-2 only: the per provider account concurrency semaphore. | `packages/core/dist/index.d.ts` |
| <a id="property-emergencyreservefraction"></a> `emergencyReserveFraction?` | `number` | Fraction of capWires only emergency work may take (section 4.2). | `packages/core/dist/index.d.ts` |
| <a id="property-refillwirespersecond"></a> `refillWiresPerSecond?` | `number` | Token bucket refill (wires per second); burst = capWires. | `packages/core/dist/index.d.ts` |
| <a id="property-slots"></a> `slots?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-windowms"></a> `windowMs?` | `number` | Sliding window geometry (default 60000 ms over 6 slots). | `packages/core/dist/index.d.ts` |
