[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / LeasableStore

# Interface: LeasableStore

Defined in: [packages/core/src/l0/spi/store.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L141)

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

Defined in: [packages/core/src/l0/spi/store.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L142)

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

Defined in: [packages/core/src/l0/spi/store.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L116)

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

Defined in: [packages/core/src/l0/spi/store.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L120)

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

Defined in: [packages/core/src/l0/spi/store.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L119)

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

Defined in: [packages/core/src/l0/spi/store.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L117)

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

Defined in: [packages/core/src/l0/spi/store.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L118)

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

Defined in: [packages/core/src/l0/spi/store.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L144)

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

Defined in: [packages/core/src/l0/spi/store.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L143)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;
