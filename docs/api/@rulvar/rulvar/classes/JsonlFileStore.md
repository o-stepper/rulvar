[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JsonlFileStore

# Class: JsonlFileStore

Defined in: `packages/core/dist/index.d.ts`

Exact lookup capability: fetch one run's meta without materializing
the whole catalog (the v1.25.0 scale review: `resume`, HTTP status,
and CLI point lookups were O(all runs) through `listRuns`). Optional
exactly like the lease capability: engines and shells detect it with
`hasMetaLookup` and fall back to `listRuns` + find, so a conformant
store written before this capability keeps working unoptimized. A
missing run resolves `undefined`, never a rejection.

## Implements

- [`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md)

## Constructors

### Constructor

```ts
new JsonlFileStore(options): JsonlFileStore;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md).[`append`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md#append)

***

### delete()

```ts
delete(runId): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md).[`delete`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md#delete)

***

### getMeta()

```ts
getMeta(runId): Promise<RunMeta | undefined>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) \| `undefined`\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md).[`getMeta`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md#getmeta)

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

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md).[`listRuns`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md#listruns)

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

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md).[`load`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md#load)

***

### putMeta()

```ts
putMeta(m): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md).[`putMeta`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md#putmeta)
