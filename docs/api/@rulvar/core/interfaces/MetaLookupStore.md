[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / MetaLookupStore

# Interface: MetaLookupStore

Defined in: [packages/core/src/l0/spi/store.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L154)

Exact lookup capability: fetch one run's meta without materializing
the whole catalog (the v1.25.0 scale review: `resume`, HTTP status,
and CLI point lookups were O(all runs) through `listRuns`). Optional
exactly like the lease capability: engines and shells detect it with
`hasMetaLookup` and fall back to `listRuns` + find, so a conformant
store written before this capability keeps working unoptimized. A
missing run resolves `undefined`, never a rejection.

## Extends

- [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md)

## Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-fencedwrites"></a> `fencedWrites?` | `readonly` | `true` | Fenced writes capability (the fenced run state RFC, phase 2), optional exactly like `getMeta` and `leaseTtlMs`: a store declaring `fencedWrites: true` PROMISES that every mutation carrying a lease (`append`, `putMeta`, `delete`) verifies it is the CURRENT holder for the run the mutation targets, atomically with the mutation itself, and rejects with the typed LeaseHeldError leaving nothing mutated when it is not (stale epoch, foreign owner, expired, or a lease whose runId is not the mutation's run). The engine threads the segment's lease into every one of these writes on a leased resume, so over a declaring store a superseded worker cannot overwrite run meta or delete run state, exactly as it already cannot append. A mutation carrying NO lease keeps the single-writer semantics unchanged. Stores written before this capability are unaffected: without the marker the extra argument is ignored and hosts know the surface is advisory. | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`fencedWrites`](/api/@rulvar/core/interfaces/JournalStore.md#property-fencedwrites) | [packages/core/src/l0/spi/store.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L142) |

## Methods

### append()

```ts
append(
   runId, 
   e, 
lease?): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L120)

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
delete(runId, lease?): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L124)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`delete`](/api/@rulvar/core/interfaces/JournalStore.md#delete)

***

### getMeta()

```ts
getMeta(runId): Promise<RunMeta | undefined>;
```

Defined in: [packages/core/src/l0/spi/store.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L155)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) \| `undefined`\&gt;

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: [packages/core/src/l0/spi/store.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L123)

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

Defined in: [packages/core/src/l0/spi/store.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L121)

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
putMeta(m, lease?): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L122)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) |
| `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`putMeta`](/api/@rulvar/core/interfaces/JournalStore.md#putmeta)
