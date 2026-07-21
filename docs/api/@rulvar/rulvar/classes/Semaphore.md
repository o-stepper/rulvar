[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Semaphore

# Class: Semaphore

Defined in: `packages/core/dist/index.d.ts`

## Constructors

### Constructor

```ts
new Semaphore(limit): Semaphore;
```

Defined in: `packages/core/dist/index.d.ts`

`limit` must be a positive integer: anything else (NaN included) is
a typed ConfigError. Before this gate a NaN limit made
`active < limit` permanently false, so the first acquire queued
forever and the run could not settle, not even through cancel()
(v1.34.0 review P2-4). Unlimited is expressed by not constructing a
semaphore, never by a sentinel limit.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `limit` | `number` |

#### Returns

`Semaphore`

## Accessors

### pending

#### Get Signature

```ts
get pending(): number;
```

Defined in: `packages/core/dist/index.d.ts`

##### Returns

`number`

## Methods

### acquire()

```ts
acquire(onQueued?, signal?): Promise<() => void>;
```

Defined in: `packages/core/dist/index.d.ts`

Acquires a slot, resolving in FIFO order. `onQueued` fires only when
the caller actually has to wait (feeds the agent:queued event).
An aborted `signal` releases the caller from the queue without a
slot: the returned release is a no-op, the remaining waiters keep
their FIFO positions, and the caller proceeds to observe its own
aborted signal (the model layers refuse dispatch under an aborted
signal, so no provider call follows). Cancellation can therefore
always drain a queued run (v1.34.0 review P2-4).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `onQueued?` | () => `void` |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`\&lt;() =&gt; `void`\>

***

### withSlot()

```ts
withSlot<T>(
   fn, 
   onQueued?, 
signal?): Promise<T>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `fn` | () => `Promise`\&lt;`T`\&gt; |
| `onQueued?` | () => `void` |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`\&lt;`T`\&gt;
