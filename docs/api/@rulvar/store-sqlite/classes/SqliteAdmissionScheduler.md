[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteAdmissionScheduler

# Class: SqliteAdmissionScheduler

Defined in: [packages/store-sqlite/src/admission.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L42)

## Implements

- [`AdmissionScheduler`](/api/@rulvar/rulvar/interfaces/AdmissionScheduler.md)

## Constructors

### Constructor

```ts
new SqliteAdmissionScheduler(options): SqliteAdmissionScheduler;
```

Defined in: [packages/store-sqlite/src/admission.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L49)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`SqliteAdmissionSchedulerOptions`](/api/@rulvar/store-sqlite/interfaces/SqliteAdmissionSchedulerOptions.md) |

#### Returns

`SqliteAdmissionScheduler`

## Methods

### cancel()

```ts
cancel(
   unitId, 
   generation, 
opId): Promise<void>;
```

Defined in: [packages/store-sqlite/src/admission.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L145)

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

Defined in: [packages/store-sqlite/src/admission.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L127)

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
close(): void;
```

Defined in: [packages/store-sqlite/src/admission.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L67)

#### Returns

`void`

***

### enqueue()

```ts
enqueue(request, opId): Promise<AdmissionTicketDecision>;
```

Defined in: [packages/store-sqlite/src/admission.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L115)

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

Defined in: [packages/store-sqlite/src/admission.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L149)

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

### recover()

```ts
recover(
   unitId, 
   generation, 
opId): Promise<AdmissionRecovery>;
```

Defined in: [packages/store-sqlite/src/admission.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L119)

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

Defined in: [packages/store-sqlite/src/admission.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L136)

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

Defined in: [packages/store-sqlite/src/admission.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/admission.ts#L123)

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
