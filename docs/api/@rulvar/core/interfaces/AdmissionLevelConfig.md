[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionLevelConfig

# Interface: AdmissionLevelConfig

Defined in: [packages/core/src/admission/memory.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L46)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-algorithm"></a> `algorithm` | `"sliding-window"` \| `"token-bucket"` | - | [packages/core/src/admission/memory.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L47) |
| <a id="property-capwires"></a> `capWires` | `number` | Total wires capacity: the feasibility bound and the cap. | [packages/core/src/admission/memory.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L49) |
| <a id="property-concurrency"></a> `concurrency?` | `number` | Level-2 only: the per provider account concurrency semaphore. | [packages/core/src/admission/memory.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L56) |
| <a id="property-emergencyreservefraction"></a> `emergencyReserveFraction?` | `number` | Fraction of capWires only emergency work may take (section 4.2). | [packages/core/src/admission/memory.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L58) |
| <a id="property-refillwirespersecond"></a> `refillWiresPerSecond?` | `number` | Token bucket refill (wires per second); burst = capWires. | [packages/core/src/admission/memory.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L54) |
| <a id="property-slots"></a> `slots?` | `number` | - | [packages/core/src/admission/memory.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L52) |
| <a id="property-windowms"></a> `windowMs?` | `number` | Sliding window geometry (default 60000 ms over 6 slots). | [packages/core/src/admission/memory.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L51) |
