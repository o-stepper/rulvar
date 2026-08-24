[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionState

# Interface: AdmissionState

Defined in: `packages/core/dist/index.d.ts`

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
| <a id="property-accountqueues"></a> `accountQueues` | `Record`\&lt;`string`, [`FairQueueState`](/api/@rulvar/rulvar/interfaces/FairQueueState.md)\&gt; | `packages/core/dist/index.d.ts` |
| <a id="property-arrivalcounter"></a> `arrivalCounter` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-buckets"></a> `buckets` | `Record`\&lt;`string`, \{ `bucket?`: [`TokenBucketState`](/api/@rulvar/rulvar/interfaces/TokenBucketState.md); `debts`: \{ `atMs`: `number`; `wires`: `number`; \}[]; `held`: `number`; `window?`: [`SlidingWindowState`](/api/@rulvar/rulvar/interfaces/SlidingWindowState.md); \}\&gt; | `packages/core/dist/index.d.ts` |
| <a id="property-tenantqueue"></a> `tenantQueue` | [`FairQueueState`](/api/@rulvar/rulvar/interfaces/FairQueueState.md) | `packages/core/dist/index.d.ts` |
| <a id="property-tickets"></a> `tickets` | `Record`\&lt;`string`, \{ `accountFinishTag`: `number`; `accountStartTag`: `number`; `appliedOps`: `string`[]; `keys`: `Partial`\&lt;`Record`\&lt;`"tenant"` \| `"providerAccount"` \| `"scope"`, `string`\&gt;\&gt;; `request`: [`AdmissionRequest`](/api/@rulvar/rulvar/interfaces/AdmissionRequest.md); `ticket`: [`AdmissionTicket`](/api/@rulvar/rulvar/interfaces/AdmissionTicket.md); \}\&gt; | `packages/core/dist/index.d.ts` |
