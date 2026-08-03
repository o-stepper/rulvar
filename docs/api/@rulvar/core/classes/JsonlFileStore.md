[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JsonlFileStore

# Class: JsonlFileStore

Defined in: [packages/core/src/stores/jsonl.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L114)

Exact lookup capability: fetch one run's meta without materializing
the whole catalog (the v1.25.0 scale review: `resume`, HTTP status,
and CLI point lookups were O(all runs) through `listRuns`). Optional
exactly like the lease capability: engines and shells detect it with
`hasMetaLookup` and fall back to `listRuns` + find, so a conformant
store written before this capability keeps working unoptimized. A
missing run resolves `undefined`, never a rejection.

## Implements

- [`MetaLookupStore`](/api/@rulvar/core/interfaces/MetaLookupStore.md)

## Constructors

### Constructor

```ts
new JsonlFileStore(options): JsonlFileStore;
```

Defined in: [packages/core/src/stores/jsonl.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L135)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `dir`: `string`; `repairOnLoad?`: `boolean`; \} |
| `options.dir` | `string` |
| `options.repairOnLoad?` | `boolean` |

#### Returns

`JsonlFileStore`

## Methods

### append()

```ts
append(runId, e): Promise<void>;
```

Defined in: [packages/core/src/stores/jsonl.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L149)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/core/interfaces/MetaLookupStore.md).[`append`](/api/@rulvar/core/interfaces/MetaLookupStore.md#append)

***

### delete()

```ts
delete(runId): Promise<void>;
```

Defined in: [packages/core/src/stores/jsonl.ts:315](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L315)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/core/interfaces/MetaLookupStore.md).[`delete`](/api/@rulvar/core/interfaces/MetaLookupStore.md#delete)

***

### getMeta()

```ts
getMeta(runId): Promise<RunMeta | undefined>;
```

Defined in: [packages/core/src/stores/jsonl.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L287)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) \| `undefined`\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/core/interfaces/MetaLookupStore.md).[`getMeta`](/api/@rulvar/core/interfaces/MetaLookupStore.md#getmeta)

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: [packages/core/src/stores/jsonl.ts:299](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L299)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/core/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md)[]\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/core/interfaces/MetaLookupStore.md).[`listRuns`](/api/@rulvar/core/interfaces/MetaLookupStore.md#listruns)

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: [packages/core/src/stores/jsonl.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L185)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/core/interfaces/MetaLookupStore.md).[`load`](/api/@rulvar/core/interfaces/MetaLookupStore.md#load)

***

### putMeta()

```ts
putMeta(m): Promise<void>;
```

Defined in: [packages/core/src/stores/jsonl.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/jsonl.ts#L278)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/core/interfaces/MetaLookupStore.md).[`putMeta`](/api/@rulvar/core/interfaces/MetaLookupStore.md#putmeta)
