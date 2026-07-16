[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InMemoryTranscriptStore

# Class: InMemoryTranscriptStore

Defined in: [packages/core/src/stores/inmemory.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L107)

In-memory TranscriptStore. Refs follow the `<runId>/<name>` convention
so list(runId) can filter without a side index.

## Implements

- [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md)

## Constructors

### Constructor

```ts
new InMemoryTranscriptStore(): InMemoryTranscriptStore;
```

#### Returns

`InMemoryTranscriptStore`

## Methods

### delete()

```ts
delete(ref): Promise<void>;
```

Defined in: [packages/core/src/stores/inmemory.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L125)

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

Defined in: [packages/core/src/stores/inmemory.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L115)

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

Defined in: [packages/core/src/stores/inmemory.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L120)

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

Defined in: [packages/core/src/stores/inmemory.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L110)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md).[`put`](/api/@rulvar/core/interfaces/TranscriptStore.md#put)
