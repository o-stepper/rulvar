[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteTranscriptStore

# Interface: SqliteTranscriptStore

Defined in: [packages/store-sqlite/src/store.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L88)

The fenced transcript twin over a SqliteStore database (the fenced
run state RFC, F2): a TranscriptStore that declares `fencedWrites`
because its blobs live in the SAME database as the lease rows, giving
the fence check and the blob mutation one transactional domain.
Obtain it from [SqliteStore.transcripts](/api/@rulvar/store-sqlite/classes/SqliteStore.md#transcripts); its lifetime is the
owning store's (one shared connection, one `close()`).

## Extends

- [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md)

## Properties

| Property | Modifier | Type | Description | Overrides | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-fencedwrites"></a> `fencedWrites` | `readonly` | `true` | Fenced writes capability (the fenced run state RFC, phase 2), the transcript-side twin of the JournalStore marker: a store declaring it verifies a lease-carrying `put` or `delete` against the CURRENT lease of the run the ref's leading path segment names, atomically with the mutation, and rejects stale holders with the typed LeaseHeldError leaving the prior blob intact. The engine threads the segment's lease into every blob write of a leased resume (checkpoints, compaction summaries, worktree patches, workflow sources). The shipped file and in-memory transcript stores do NOT declare it (they are single-writer by contract); a fenced implementation needs the blobs and the lease state in one transactional domain, which is exactly how the sqlite twin ships: `SqliteStore.transcripts()` in `@rulvar/store-sqlite` keeps blobs beside the lease rows of the same database. | [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md).[`fencedWrites`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md#property-fencedwrites) | [packages/store-sqlite/src/store.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L89) |

## Methods

### delete()

```ts
delete(ref, lease?): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

Deletes one blob; a missing ref is a no-op, never an error (M8-T04
amendment, OQ-20: retention is impossible without blob deletion).
The cascade over a run's blobs is ENGINE-side (Engine.deleteRun),
never a store obligation.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md).[`delete`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md#delete)

***

### get()

```ts
get(ref): Promise<Bytes | null>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |

#### Returns

`Promise`\&lt;[`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md) \| `null`\&gt;

#### Inherited from

[`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md).[`get`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md#get)

***

### list()

```ts
list(runId): Promise<string[]>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`string`[]\&gt;

#### Inherited from

[`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md).[`list`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md#list)

***

### put()

```ts
put(
   ref, 
   blob, 
lease?): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md) |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md).[`put`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md#put)
