[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / LeasableStore

# Interface: LeasableStore

Defined in: `packages/core/dist/index.d.ts`

Lease capability: acquire on a held lease MUST reject with a typed
LeaseHeldError; renew MUST run at an interval of at most ttl/3; an
append carrying a stale epoch MUST be rejected and never appear in load.

## Extends

- [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-leasettlms"></a> `leaseTtlMs?` | `readonly` | `number` | Optional TTL introspection (v1.35.0 review P2-4): the configured lease ttl in milliseconds. A store exposing it lets createWorker VERIFY at construction that the worker's renew cadence matches the store's expiry instead of trusting two config sources to agree; stores without it are accepted with the worker's own ttl. | `packages/core/dist/index.d.ts` |

## Methods

### acquire()

```ts
acquire(runId, owner): Promise<Lease>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `owner` | `string` |

#### Returns

`Promise`\&lt;[`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md)\&gt;

***

### append()

```ts
append(
   runId, 
   e, 
lease?): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md).[`append`](/api/@rulvar/rulvar/interfaces/JournalStore.md#append)

***

### delete()

```ts
delete(runId): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md).[`delete`](/api/@rulvar/rulvar/interfaces/JournalStore.md#delete)

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/rulvar/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md)[]\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md).[`listRuns`](/api/@rulvar/rulvar/interfaces/JournalStore.md#listruns)

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md).[`load`](/api/@rulvar/rulvar/interfaces/JournalStore.md#load)

***

### putMeta()

```ts
putMeta(m): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md).[`putMeta`](/api/@rulvar/rulvar/interfaces/JournalStore.md#putmeta)

***

### release()

```ts
release(l): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### renew()

```ts
renew(l): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;
