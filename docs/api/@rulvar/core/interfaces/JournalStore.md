[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalStore

# Interface: JournalStore

Defined in: [packages/core/src/l0/spi/store.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L87)

## Extended by

- [`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md)

## Methods

### append()

```ts
append(
   runId, 
   e, 
lease?): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L88)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |
| `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### delete()

```ts
delete(runId): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L92)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: [packages/core/src/l0/spi/store.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L91)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/core/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md)[]\&gt;

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: [packages/core/src/l0/spi/store.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L89)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]\&gt;

***

### putMeta()

```ts
putMeta(m): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L90)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) |

#### Returns

`Promise`\&lt;`void`\&gt;
