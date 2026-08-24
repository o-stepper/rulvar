[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionState

# Interface: AdmissionState

Defined in: [packages/core/src/admission/memory.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L112)

The scheduler's WHOLE state as one plain-JSON document: the durable
implementations (sqlite, postgres) persist exactly this shape and
CAS it atomically per lifecycle call, which is the RFC's first
shipped durable form (a single scheduler over durable state; the
multi-replica story beyond deterministic ordering is deferred by
section 10). Per-row schemas are an optimization the SPI does not
require: atomic "state moved AND buckets moved" holds trivially when
the whole document commits or none of it does.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-accountqueues"></a> `accountQueues` | `Record`\&lt;`string`, [`FairQueueState`](/api/@rulvar/core/interfaces/FairQueueState.md)\&gt; | [packages/core/src/admission/memory.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L134) |
| <a id="property-arrivalcounter"></a> `arrivalCounter` | `number` | [packages/core/src/admission/memory.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L135) |
| <a id="property-buckets"></a> `buckets` | `Record`\&lt;`string`, \{ `bucket?`: [`TokenBucketState`](/api/@rulvar/core/interfaces/TokenBucketState.md); `debts`: \{ `atMs`: `number`; `wires`: `number`; \}[]; `held`: `number`; `window?`: [`SlidingWindowState`](/api/@rulvar/core/interfaces/SlidingWindowState.md); \}\&gt; | [packages/core/src/admission/memory.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L124) |
| <a id="property-tenantqueue"></a> `tenantQueue` | [`FairQueueState`](/api/@rulvar/core/interfaces/FairQueueState.md) | [packages/core/src/admission/memory.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L133) |
| <a id="property-tickets"></a> `tickets` | `Record`\&lt;`string`, \{ `accountFinishTag`: `number`; `accountStartTag`: `number`; `appliedOps`: `string`[]; `keys`: `Partial`\&lt;`Record`\&lt;`"tenant"` \| `"providerAccount"` \| `"scope"`, `string`\&gt;\&gt;; `request`: [`AdmissionRequest`](/api/@rulvar/core/interfaces/AdmissionRequest.md); `ticket`: [`AdmissionTicket`](/api/@rulvar/core/interfaces/AdmissionTicket.md); \}\&gt; | [packages/core/src/admission/memory.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L113) |
