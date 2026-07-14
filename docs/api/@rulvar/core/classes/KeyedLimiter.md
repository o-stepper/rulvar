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
onQueued?): Promise<T>;
```

Defined in: [packages/core/src/model/concurrency.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/concurrency.ts#L34)

Runs `fn` under the key's semaphore; keys without a configured cap
run unlimited (no queueing, no overhead).

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

#### Returns

`Promise`\&lt;`T`\&gt;
