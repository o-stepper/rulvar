[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / LeasableStore

# Interface: LeasableStore

Defined in: [packages/core/src/l0/spi/store.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L68)

Lease capability: acquire on a held lease MUST reject with a typed
LeaseHeldError; renew MUST run at an interval of at most ttl/3; an
append carrying a stale epoch MUST be rejected and never appear in load.

## Extends

- [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md)

## Methods

### acquire()

```ts
acquire(runId, owner): Promise<Lease>;
```

Defined in: [packages/core/src/l0/spi/store.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L69)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `owner` | `string` |

#### Returns

`Promise`\&lt;[`Lease`](/api/@rulvar/core/type-aliases/Lease.md)\&gt;

***

### append()

```ts
append(
   runId, 
   e, 
lease?): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L56)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |
| `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`append`](/api/@rulvar/core/interfaces/JournalStore.md#append)

***

### delete()

```ts
delete(runId): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L60)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`delete`](/api/@rulvar/core/interfaces/JournalStore.md#delete)

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: [packages/core/src/l0/spi/store.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L59)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/core/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md)[]\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`listRuns`](/api/@rulvar/core/interfaces/JournalStore.md#listruns)

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: [packages/core/src/l0/spi/store.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L57)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`load`](/api/@rulvar/core/interfaces/JournalStore.md#load)

***

### putMeta()

```ts
putMeta(m): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L58)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`putMeta`](/api/@rulvar/core/interfaces/JournalStore.md#putmeta)

***

### release()

```ts
release(l): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L71)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### renew()

```ts
renew(l): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L70)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;
