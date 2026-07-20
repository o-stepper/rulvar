[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InMemoryStore

# Class: InMemoryStore

Defined in: [packages/core/src/stores/inmemory.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L20)

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
new InMemoryStore(options?): InMemoryStore;
```

Defined in: [packages/core/src/stores/inmemory.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L25)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | \{ `quiet?`: `boolean`; \} |
| `options.quiet?` | `boolean` |

#### Returns

`InMemoryStore`

## Methods

### append()

```ts
append(runId, e): Promise<void>;
```

Defined in: [packages/core/src/stores/inmemory.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L31)

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

Defined in: [packages/core/src/stores/inmemory.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L79)

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

Defined in: [packages/core/src/stores/inmemory.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L67)

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

Defined in: [packages/core/src/stores/inmemory.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L72)

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

Defined in: [packages/core/src/stores/inmemory.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L58)

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

Defined in: [packages/core/src/stores/inmemory.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/inmemory.ts#L62)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/core/interfaces/MetaLookupStore.md).[`putMeta`](/api/@rulvar/core/interfaces/MetaLookupStore.md#putmeta)
