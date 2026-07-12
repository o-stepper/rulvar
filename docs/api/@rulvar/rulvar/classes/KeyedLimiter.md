[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / KeyedLimiter

# Class: KeyedLimiter

Defined in: `packages/core/dist/index.d.ts`

## Constructors

### Constructor

```ts
new KeyedLimiter(caps?): KeyedLimiter;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

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
