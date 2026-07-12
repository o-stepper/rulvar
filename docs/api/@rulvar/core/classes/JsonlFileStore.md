[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JsonlFileStore

# Class: JsonlFileStore

Defined in: [packages/core/src/stores/jsonl.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L49)

## Implements

- [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md)

## Constructors

### Constructor

```ts
new JsonlFileStore(options): JsonlFileStore;
```

Defined in: [packages/core/src/stores/jsonl.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L52)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `dir`: `string`; \} |
| `options.dir` | `string` |

#### Returns

`JsonlFileStore`

## Methods

### append()

```ts
append(runId, e): Promise<void>;
```

Defined in: [packages/core/src/stores/jsonl.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L66)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`append`](/api/@rulvar/core/interfaces/JournalStore.md#append)

***

### delete()

```ts
delete(runId): Promise<void>;
```

Defined in: [packages/core/src/stores/jsonl.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L162)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`delete`](/api/@rulvar/core/interfaces/JournalStore.md#delete)

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: [packages/core/src/stores/jsonl.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L134)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/core/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md)[]\&gt;

#### Implementation of

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`listRuns`](/api/@rulvar/core/interfaces/JournalStore.md#listruns)

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: [packages/core/src/stores/jsonl.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L74)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]\&gt;

#### Implementation of

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`load`](/api/@rulvar/core/interfaces/JournalStore.md#load)

***

### putMeta()

```ts
putMeta(m): Promise<void>;
```

Defined in: [packages/core/src/stores/jsonl.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L125)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`putMeta`](/api/@rulvar/core/interfaces/JournalStore.md#putmeta)
