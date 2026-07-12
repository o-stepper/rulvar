[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FileTranscriptStore

# Class: FileTranscriptStore

Defined in: [packages/core/src/stores/jsonl.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L177)

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

Defined in: [packages/core/src/stores/jsonl.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L180)

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

Defined in: [packages/core/src/stores/jsonl.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L244)

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

Defined in: [packages/core/src/stores/jsonl.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L208)

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

Defined in: [packages/core/src/stores/jsonl.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L220)

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

Defined in: [packages/core/src/stores/jsonl.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L199)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md).[`put`](/api/@rulvar/core/interfaces/TranscriptStore.md#put)
