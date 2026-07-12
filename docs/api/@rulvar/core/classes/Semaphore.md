[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Semaphore

# Class: Semaphore

Defined in: [packages/core/src/engine/scheduler.ts:12](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/scheduler.ts#L12)

## Constructors

### Constructor

```ts
new Semaphore(limit): Semaphore;
```

Defined in: [packages/core/src/engine/scheduler.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/scheduler.ts#L17)

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

Defined in: [packages/core/src/engine/scheduler.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/scheduler.ts#L21)

##### Returns

`number`

## Methods

### acquire()

```ts
acquire(onQueued?): Promise<() => void>;
```

Defined in: [packages/core/src/engine/scheduler.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/scheduler.ts#L29)

Acquires a slot, resolving in FIFO order. `onQueued` fires only when
the caller actually has to wait (feeds the agent:queued event).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `onQueued?` | () => `void` |

#### Returns

`Promise`\&lt;() =&gt; `void`\>

***

### withSlot()

```ts
withSlot<T>(fn, onQueued?): Promise<T>;
```

Defined in: [packages/core/src/engine/scheduler.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/scheduler.ts#L42)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `fn` | () => `Promise`\&lt;`T`\&gt; |
| `onQueued?` | () => `void` |

#### Returns

`Promise`\&lt;`T`\&gt;
