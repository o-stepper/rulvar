[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionScheduler

# Interface: AdmissionScheduler

Defined in: `packages/core/dist/index.d.ts`

## Methods

### cancel()

```ts
cancel(
   unitId, 
   generation, 
opId): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

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
| `cover` | [`AdmissionReservation`](/api/@rulvar/rulvar/interfaces/AdmissionReservation.md) |
| `opId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### enqueue()

```ts
enqueue(request, opId): Promise<AdmissionTicketDecision>;
```

Defined in: `packages/core/dist/index.d.ts`

Conditional create by `(unitId, generation)` plus immediate grant
when every matched level admits; `opId` makes retries idempotent.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`AdmissionRequest`](/api/@rulvar/rulvar/interfaces/AdmissionRequest.md) |
| `opId` | `string` |

#### Returns

`Promise`\&lt;[`AdmissionTicketDecision`](/api/@rulvar/rulvar/type-aliases/AdmissionTicketDecision.md)\&gt;

***

### pump()

```ts
pump(opId): Promise<AdmissionTicket[]>;
```

Defined in: `packages/core/dist/index.d.ts`

Advances the scheduler: expires stale leases (conservative
settlement), then grants queued tickets in SFQ order while every
matched level admits. Returns the newly granted tickets.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `opId` | `string` |

#### Returns

`Promise`\&lt;[`AdmissionTicket`](/api/@rulvar/rulvar/interfaces/AdmissionTicket.md)[]\&gt;

***

### recover()

```ts
recover(
   unitId, 
   generation, 
opId): Promise<AdmissionRecovery>;
```

Defined in: `packages/core/dist/index.d.ts`

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

`Promise`\&lt;[`AdmissionRecovery`](/api/@rulvar/rulvar/type-aliases/AdmissionRecovery.md)\&gt;

***

### release()

```ts
release(
   unitId, 
   generation, 
   actuals, 
opId): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

Release with actuals: the unused remainder refunds to each level,
over-consumption beyond the reservation lands as bucket debt (it
never denies retroactively), and a late settlement after expiry is
accepted idempotently as debt rather than discarded.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unitId` | `string` |
| `generation` | `string` |
| `actuals` | [`AdmissionReservation`](/api/@rulvar/rulvar/interfaces/AdmissionReservation.md) |
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

Defined in: `packages/core/dist/index.d.ts`

Renews a granted ticket's lease; unknown tickets are no-ops.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unitId` | `string` |
| `generation` | `string` |
| `opId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;
