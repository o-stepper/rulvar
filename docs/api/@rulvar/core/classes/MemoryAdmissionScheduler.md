[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / MemoryAdmissionScheduler

# Class: MemoryAdmissionScheduler

Defined in: [packages/core/src/admission/memory.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L138)

## Implements

- [`AdmissionScheduler`](/api/@rulvar/core/interfaces/AdmissionScheduler.md)

## Constructors

### Constructor

```ts
new MemoryAdmissionScheduler(options): MemoryAdmissionScheduler;
```

Defined in: [packages/core/src/admission/memory.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L146)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`MemoryAdmissionOptions`](/api/@rulvar/core/interfaces/MemoryAdmissionOptions.md) |

#### Returns

`MemoryAdmissionScheduler`

## Methods

### cancel()

```ts
cancel(
   unitId, 
   generation, 
opId): Promise<void>;
```

Defined in: [packages/core/src/admission/memory.ts:580](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L580)

Cancels a queued ticket (nothing to refund); granted ones release.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unitId` | `string` |
| `generation` | `string` |
| `opId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/core/interfaces/AdmissionScheduler.md).[`cancel`](/api/@rulvar/core/interfaces/AdmissionScheduler.md#cancel)

***

### checkpointCover()

```ts
checkpointCover(
   unitId, 
   generation, 
   cover, 
opId): Promise<void>;
```

Defined in: [packages/core/src/admission/memory.ts:522](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L522)

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

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/core/interfaces/AdmissionScheduler.md).[`checkpointCover`](/api/@rulvar/core/interfaces/AdmissionScheduler.md#checkpointcover)

***

### enqueue()

```ts
enqueue(request, opId): Promise<AdmissionTicketDecision>;
```

Defined in: [packages/core/src/admission/memory.ts:365](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L365)

Conditional create by `(unitId, generation)` plus immediate grant
when every matched level admits; `opId` makes retries idempotent.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`AdmissionRequest`](/api/@rulvar/core/interfaces/AdmissionRequest.md) |
| `opId` | `string` |

#### Returns

`Promise`\&lt;[`AdmissionTicketDecision`](/api/@rulvar/core/type-aliases/AdmissionTicketDecision.md)\&gt;

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/core/interfaces/AdmissionScheduler.md).[`enqueue`](/api/@rulvar/core/interfaces/AdmissionScheduler.md#enqueue)

***

### pump()

```ts
pump(_opId): Promise<AdmissionTicket[]>;
```

Defined in: [packages/core/src/admission/memory.ts:600](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L600)

Advances the scheduler: expires stale leases (conservative
settlement), then grants queued tickets in SFQ order while every
matched level admits. Returns the newly granted tickets.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `_opId` | `string` |

#### Returns

`Promise`\&lt;[`AdmissionTicket`](/api/@rulvar/core/interfaces/AdmissionTicket.md)[]\&gt;

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/core/interfaces/AdmissionScheduler.md).[`pump`](/api/@rulvar/core/interfaces/AdmissionScheduler.md#pump)

***

### recover()

```ts
recover(
   unitId, 
   generation, 
opId): Promise<AdmissionRecovery>;
```

Defined in: [packages/core/src/admission/memory.ts:497](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L497)

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

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/core/interfaces/AdmissionScheduler.md).[`recover`](/api/@rulvar/core/interfaces/AdmissionScheduler.md#recover)

***

### release()

```ts
release(
   unitId, 
   generation, 
   actuals, 
opId): Promise<void>;
```

Defined in: [packages/core/src/admission/memory.ts:544](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L544)

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

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/core/interfaces/AdmissionScheduler.md).[`release`](/api/@rulvar/core/interfaces/AdmissionScheduler.md#release)

***

### renew()

```ts
renew(
   unitId, 
   generation, 
_opId): Promise<void>;
```

Defined in: [packages/core/src/admission/memory.ts:514](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L514)

Renews a granted ticket's lease; unknown tickets are no-ops.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unitId` | `string` |
| `generation` | `string` |
| `_opId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/core/interfaces/AdmissionScheduler.md).[`renew`](/api/@rulvar/core/interfaces/AdmissionScheduler.md#renew)

***

### snapshot()

```ts
snapshot(): AdmissionState;
```

Defined in: [packages/core/src/admission/memory.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/memory.ts#L186)

The whole state as a plain-JSON document (deep-copied).

#### Returns

[`AdmissionState`](/api/@rulvar/core/interfaces/AdmissionState.md)
