[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / TranscriptStore

# Interface: TranscriptStore

Defined in: `packages/core/dist/index.d.ts`

## Extended by

- [`SqliteTranscriptStore`](/api/@rulvar/store-sqlite/interfaces/SqliteTranscriptStore.md)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-fencedwrites"></a> `fencedWrites?` | `readonly` | `true` | Fenced writes capability (the fenced run state RFC, phase 2), the transcript-side twin of the JournalStore marker: a store declaring it verifies a lease-carrying `put` or `delete` against the CURRENT lease of the run the ref's leading path segment names, atomically with the mutation, and rejects stale holders with the typed LeaseHeldError leaving the prior blob intact. The engine threads the segment's lease into every blob write of a leased resume (checkpoints, compaction summaries, worktree patches, workflow sources). The shipped file and in-memory transcript stores do NOT declare it (they are single-writer by contract); a fenced implementation needs the blobs and the lease state in one transactional domain, which is exactly how the sqlite twin ships: `SqliteStore.transcripts()` in `@rulvar/store-sqlite` keeps blobs beside the lease rows of the same database. | `packages/core/dist/index.d.ts` |

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
