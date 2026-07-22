[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournalStore

# Interface: JournalStore

Defined in: `packages/core/dist/index.d.ts`

## Extended by

- [`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md)
- [`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-fencedwrites"></a> `fencedWrites?` | `readonly` | `true` | Fenced writes capability (the fenced run state RFC, phase 2), optional exactly like `getMeta` and `leaseTtlMs`: a store declaring `fencedWrites: true` PROMISES that every mutation carrying a lease (`append`, `putMeta`, `delete`) verifies it is the CURRENT holder for the run the mutation targets, atomically with the mutation itself, and rejects with the typed LeaseHeldError leaving nothing mutated when it is not (stale epoch, foreign owner, expired, or a lease whose runId is not the mutation's run). The engine threads the segment's lease into every one of these writes on a leased resume, so over a declaring store a superseded worker cannot overwrite run meta or delete run state, exactly as it already cannot append. A mutation carrying NO lease keeps the single-writer semantics unchanged. Stores written before this capability are unaffected: without the marker the extra argument is ignored and hosts know the surface is advisory. | `packages/core/dist/index.d.ts` |

## Methods

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

***

### delete()

```ts
delete(runId, lease?): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

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

***

### putMeta()

```ts
putMeta(m, lease?): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;
