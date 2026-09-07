[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionLevelConfig

# Interface: AdmissionLevelConfig

Defined in: [packages/core/src/admission/memory.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L52)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-algorithm"></a> `algorithm` | `"sliding-window"` \| `"token-bucket"` | - | [packages/core/src/admission/memory.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L53) |
| <a id="property-capwires"></a> `capWires` | `number` | Total wires capacity: the feasibility bound and the cap. | [packages/core/src/admission/memory.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L55) |
| <a id="property-concurrency"></a> `concurrency?` | `number` | The level's active grant semaphore (RV4909): at most this many granted tickets hold one bucket of the level at once, on ANY level (a per tenant cap of active runs, a per provider account cap, a per scope cap). Taken at grant, restored at release; an EXPIRED grant's slot parks under its possibly live holder (RV4910) and returns only through that holder's own release, cancel, or fresh enqueue, or an operator cancel by identity. | [packages/core/src/admission/memory.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L70) |
| <a id="property-emergencyreservefraction"></a> `emergencyReserveFraction?` | `number` | Fraction of capWires only emergency work may take (section 4.2). | [packages/core/src/admission/memory.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L72) |
| <a id="property-refillwirespersecond"></a> `refillWiresPerSecond?` | `number` | Token bucket refill (wires per second); burst = capWires. | [packages/core/src/admission/memory.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L60) |
| <a id="property-slots"></a> `slots?` | `number` | - | [packages/core/src/admission/memory.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L58) |
| <a id="property-windowms"></a> `windowMs?` | `number` | Sliding window geometry (default 60000 ms over 6 slots). | [packages/core/src/admission/memory.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L57) |
