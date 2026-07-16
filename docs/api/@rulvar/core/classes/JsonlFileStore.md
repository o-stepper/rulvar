[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JsonlFileStore

# Class: JsonlFileStore

Defined in: [packages/core/src/stores/jsonl.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L49)

## Implements

- [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md)

## Constructors

### Constructor

```ts
new JsonlFileStore(options): JsonlFileStore;
```

Defined in: [packages/core/src/stores/jsonl.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L58)

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

Defined in: [packages/core/src/stores/jsonl.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L71)

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

Defined in: [packages/core/src/stores/jsonl.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L188)

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

Defined in: [packages/core/src/stores/jsonl.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L160)

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

Defined in: [packages/core/src/stores/jsonl.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L100)

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

Defined in: [packages/core/src/stores/jsonl.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L151)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md).[`putMeta`](/api/@rulvar/core/interfaces/JournalStore.md#putmeta)
