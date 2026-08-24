[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionScheduler

# Interface: AdmissionScheduler

Defined in: [packages/core/src/l0/spi/admission.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L121)

## Methods

### cancel()

```ts
cancel(
   unitId, 
   generation, 
opId): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/admission.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L161)

Cancels a queued ticket (nothing to refund); granted ones release.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unitId` | `string` |
| `generation` | `string` |
| `opId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### checkpointCover()

```ts
checkpointCover(
   unitId, 
   generation, 
   cover, 
opId): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/admission.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L142)

Durably checkpoints a consumption cover BEFORE the covered batch
(the intent-before-effect doctrine applied to capacity): monotone
high-water, idempotent by opId, and lease-carried: a fenced store
rejects an expired lease's cover write, which is what makes the
conservative expiry refund provable rather than optimistic.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unitId` | `string` |
| `generation` | `string` |
| `cover` | [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) |
| `opId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### enqueue()

```ts
enqueue(request, opId): Promise<AdmissionTicketDecision>;
```

Defined in: [packages/core/src/l0/spi/admission.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L126)

Conditional create by `(unitId, generation)` plus immediate grant
when every matched level admits; `opId` makes retries idempotent.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`AdmissionRequest`](/api/@rulvar/core/interfaces/AdmissionRequest.md) |
| `opId` | `string` |

#### Returns

`Promise`\&lt;[`AdmissionTicketDecision`](/api/@rulvar/core/type-aliases/AdmissionTicketDecision.md)\&gt;

***

### pump()

```ts
pump(opId): Promise<AdmissionTicket[]>;
```

Defined in: [packages/core/src/l0/spi/admission.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L181)

Advances the scheduler: expires stale leases (conservative
settlement), then grants queued tickets in SFQ order while every
matched level admits. Returns the newly granted tickets.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `opId` | `string` |

#### Returns

`Promise`\&lt;[`AdmissionTicket`](/api/@rulvar/core/interfaces/AdmissionTicket.md)[]\&gt;

***

### rebind()

```ts
rebind(
   unitId, 
   generation, 
   target, 
opId): Promise<AdmissionTicketDecision>;
```

Defined in: [packages/core/src/l0/spi/admission.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L170)

The failover transfer (RFC section 4.2, item 4): atomically
acquires the TARGET hierarchy's capacity and level-2 slot and
releases the source hierarchy in the same transition, BEFORE the
target dispatches. A failed transfer leaves the source binding
unchanged and the target undispatchable: no window exists in which
work runs on a provider account whose slot it never held.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unitId` | `string` |
| `generation` | `string` |
| `target` | \{ `scope`: [`AdmissionScopeDimensions`](/api/@rulvar/core/interfaces/AdmissionScopeDimensions.md); \} |
| `target.scope` | [`AdmissionScopeDimensions`](/api/@rulvar/core/interfaces/AdmissionScopeDimensions.md) |
| `opId` | `string` |

#### Returns

`Promise`\&lt;[`AdmissionTicketDecision`](/api/@rulvar/core/type-aliases/AdmissionTicketDecision.md)\&gt;

***

### recover()

```ts
recover(
   unitId, 
   generation, 
opId): Promise<AdmissionRecovery>;
```

Defined in: [packages/core/src/l0/spi/admission.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L132)

The resumed unit's recovery: `granted` renews the lease, a queued
ticket reports its surviving position, and `unknown` means
re-enqueue (the conservative direction).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unitId` | `string` |
| `generation` | `string` |
| `opId` | `string` |

#### Returns

`Promise`\&lt;[`AdmissionRecovery`](/api/@rulvar/core/type-aliases/AdmissionRecovery.md)\&gt;

***

### release()

```ts
release(
   unitId, 
   generation, 
   actuals, 
opId): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/admission.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L154)

Release with actuals: the unused remainder refunds to each level,
over-consumption beyond the reservation lands as bucket debt (it
never denies retroactively), and a late settlement after expiry is
accepted idempotently as debt rather than discarded.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unitId` | `string` |
| `generation` | `string` |
| `actuals` | [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) |
| `opId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### renew()

```ts
renew(
   unitId, 
   generation, 
opId): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/admission.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/admission.ts#L134)

Renews a granted ticket's lease; unknown tickets are no-ops.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unitId` | `string` |
| `generation` | `string` |
| `opId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;
