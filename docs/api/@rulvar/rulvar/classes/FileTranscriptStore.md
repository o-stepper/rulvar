[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FileTranscriptStore

# Class: FileTranscriptStore

Defined in: `packages/core/dist/index.d.ts`

File-backed TranscriptStore (M6-T02): blobs (transcripts, checkpoints,
persisted CompiledWorkflow sources) as one file per ref under `dir`,
so compiled runs resume across processes. Refs follow the
`<runId>/<name>` convention; nested segments become directories.

Every ref is contained under `dir` (v1.36.0 review SEC-P1): each
segment must match `[A-Za-z0-9._-]` and be neither empty, '.', nor
'..', and the resolved path must stay under the resolved root. A '..'
segment used to pass the per-segment alphabet (dots are in it) and, via
`join`, escape the root; a caller passing an untrusted ref (or an
untrusted runId, which prefixes checkpoint and workflow-source refs)
could read, write, or delete `.bin` files outside `dir`.

## Implements

- [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md)

## Constructors

### Constructor

```ts
new FileTranscriptStore(options): FileTranscriptStore;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `dir`: `string`; \} |
| `options.dir` | `string` |

#### Returns

`FileTranscriptStore`

## Methods

### delete()

```ts
delete(ref): Promise<void>;
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

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

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

#### Implementation of

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

#### Implementation of

[`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md).[`list`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md#list)

***

### put()

```ts
put(ref, blob): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md).[`put`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md#put)
