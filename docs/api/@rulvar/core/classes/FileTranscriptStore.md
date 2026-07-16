[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FileTranscriptStore

# Class: FileTranscriptStore

Defined in: [packages/core/src/stores/jsonl.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L204)

File-backed TranscriptStore (M6-T02): blobs (transcripts, checkpoints,
persisted CompiledWorkflow sources) as one file per ref under `dir`,
so compiled runs resume across processes. Refs follow
the `<runId>/<name>` convention; each path segment is checked
filesystem-safe and nested segments become directories.

## Implements

- [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md)

## Constructors

### Constructor

```ts
new FileTranscriptStore(options): FileTranscriptStore;
```

Defined in: [packages/core/src/stores/jsonl.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L207)

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

Defined in: [packages/core/src/stores/jsonl.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L271)

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

[`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md).[`delete`](/api/@rulvar/core/interfaces/TranscriptStore.md#delete)

***

### get()

```ts
get(ref): Promise<Bytes | null>;
```

Defined in: [packages/core/src/stores/jsonl.ts:235](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L235)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |

#### Returns

`Promise`\&lt;[`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) \| `null`\&gt;

#### Implementation of

[`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md).[`get`](/api/@rulvar/core/interfaces/TranscriptStore.md#get)

***

### list()

```ts
list(runId): Promise<string[]>;
```

Defined in: [packages/core/src/stores/jsonl.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L247)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`string`[]\&gt;

#### Implementation of

[`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md).[`list`](/api/@rulvar/core/interfaces/TranscriptStore.md#list)

***

### put()

```ts
put(ref, blob): Promise<void>;
```

Defined in: [packages/core/src/stores/jsonl.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L226)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md).[`put`](/api/@rulvar/core/interfaces/TranscriptStore.md#put)
