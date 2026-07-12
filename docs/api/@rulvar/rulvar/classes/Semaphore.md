[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Semaphore

# Class: Semaphore

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

## Constructors

### Constructor

```ts
new Semaphore(limit): Semaphore;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

##### Returns

`number`

## Methods

### acquire()

```ts
acquire(onQueued?): Promise<() => void>;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

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
