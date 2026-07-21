[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / KeyedLimiter

# Class: KeyedLimiter

Defined in: [packages/core/src/model/concurrency.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/concurrency.ts#L16)

## Constructors

### Constructor

```ts
new KeyedLimiter(caps?): KeyedLimiter;
```

Defined in: [packages/core/src/model/concurrency.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/concurrency.ts#L19)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `caps?` | `Record`\&lt;`string`, `number`\&gt; |

#### Returns

`KeyedLimiter`

## Methods

### pending()

```ts
pending(key): number;
```

Defined in: [packages/core/src/model/concurrency.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/concurrency.ts#L26)

Queue depth for one key (0 for unlimited keys); telemetry only.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

#### Returns

`number`

***

### withSlot()

```ts
withSlot<T>(
   key, 
   fn, 
   onQueued?, 
signal?): Promise<T>;
```

Defined in: [packages/core/src/model/concurrency.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/concurrency.ts#L36)

Runs `fn` under the key's semaphore; keys without a configured cap
run unlimited (no queueing, no overhead). An aborted `signal` frees
a queued caller without a slot (the Semaphore contract), so run
cancellation drains provider queues too (v1.34.0 review P2-4).

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `fn` | () => `Promise`\&lt;`T`\&gt; |
| `onQueued?` | () => `void` |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`\&lt;`T`\&gt;
