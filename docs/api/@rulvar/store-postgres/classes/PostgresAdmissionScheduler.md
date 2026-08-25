[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / PostgresAdmissionScheduler

# Class: PostgresAdmissionScheduler

Defined in: [packages/store-postgres/src/admission.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L38)

## Implements

- [`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md)

## Constructors

### Constructor

```ts
new PostgresAdmissionScheduler(options): PostgresAdmissionScheduler;
```

Defined in: [packages/store-postgres/src/admission.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L47)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`PostgresAdmissionSchedulerOptions`](/api/@rulvar/store-postgres/interfaces/PostgresAdmissionSchedulerOptions.md) |

#### Returns

`PostgresAdmissionScheduler`

## Methods

### cancel()

```ts
cancel(
   unitId, 
   generation, 
opId): Promise<void>;
```

Defined in: [packages/store-postgres/src/admission.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L176)

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

[`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md).[`cancel`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md#cancel)

***

### checkpointCover()

```ts
checkpointCover(
   unitId, 
   generation, 
   cover, 
opId): Promise<void>;
```

Defined in: [packages/store-postgres/src/admission.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L158)

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

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md).[`checkpointCover`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md#checkpointcover)

***

### close()

```ts
close(): Promise<void>;
```

Defined in: [packages/store-postgres/src/admission.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L65)

#### Returns

`Promise`\&lt;`void`\&gt;

***

### enqueue()

```ts
enqueue(request, opId): Promise<AdmissionTicketDecision>;
```

Defined in: [packages/store-postgres/src/admission.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L146)

Conditional create by `(unitId, generation)` plus immediate grant
when every matched level admits; `opId` makes retries idempotent.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`AdmissionRequest`](/api/@rulvar/rulvar/interfaces/AdmissionRequest.md) |
| `opId` | `string` |

#### Returns

`Promise`\&lt;[`AdmissionTicketDecision`](/api/@rulvar/rulvar/type-aliases/AdmissionTicketDecision.md)\&gt;

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md).[`enqueue`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md#enqueue)

***

### pump()

```ts
pump(opId): Promise<AdmissionTicket[]>;
```

Defined in: [packages/store-postgres/src/admission.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L189)

Advances the scheduler: expires stale leases (conservative
settlement), then grants queued tickets in SFQ order while every
matched level admits. Returns the newly granted tickets.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `opId` | `string` |

#### Returns

`Promise`\&lt;[`AdmissionTicket`](/api/@rulvar/rulvar/interfaces/AdmissionTicket.md)[]\&gt;

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md).[`pump`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md#pump)

***

### rebind()

```ts
rebind(
   unitId, 
   generation, 
   target, 
opId): Promise<AdmissionTicketDecision>;
```

Defined in: [packages/store-postgres/src/admission.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L180)

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
| `target` | \{ `scope`: [`AdmissionScopeDimensions`](/api/@rulvar/rulvar/interfaces/AdmissionScopeDimensions.md); \} |
| `target.scope` | [`AdmissionScopeDimensions`](/api/@rulvar/rulvar/interfaces/AdmissionScopeDimensions.md) |
| `opId` | `string` |

#### Returns

`Promise`\&lt;[`AdmissionTicketDecision`](/api/@rulvar/rulvar/type-aliases/AdmissionTicketDecision.md)\&gt;

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md).[`rebind`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md#rebind)

***

### recover()

```ts
recover(
   unitId, 
   generation, 
opId): Promise<AdmissionRecovery>;
```

Defined in: [packages/store-postgres/src/admission.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L150)

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

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md).[`recover`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md#recover)

***

### release()

```ts
release(
   unitId, 
   generation, 
   actuals, 
opId): Promise<void>;
```

Defined in: [packages/store-postgres/src/admission.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L167)

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

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md).[`release`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md#release)

***

### renew()

```ts
renew(
   unitId, 
   generation, 
opId): Promise<void>;
```

Defined in: [packages/store-postgres/src/admission.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/admission.ts#L154)

Renews a granted ticket's lease; unknown tickets are no-ops.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `unitId` | `string` |
| `generation` | `string` |
| `opId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md).[`renew`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md#renew)
