[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FileModelKnowledgeStore

# Class: FileModelKnowledgeStore

Defined in: `packages/core/dist/index.d.ts`

The SPI seam. commit performs CAS on
the monotonic snapshot version, mirroring the fencing-epoch
discipline of LeasableStore; concurrent maintenance commits serialize
through CAS rejection and rebase. commit is UNREACHABLE from the
runtime: runs hold ModelKnowledgeHandle.

## Implements

- [`ModelKnowledgeStore`](/api/@rulvar/rulvar/interfaces/ModelKnowledgeStore.md)

## Constructors

### Constructor

```ts
new FileModelKnowledgeStore(options?): FileModelKnowledgeStore;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`FileModelKnowledgeStoreOptions`](/api/@rulvar/rulvar/interfaces/FileModelKnowledgeStoreOptions.md) |

#### Returns

`FileModelKnowledgeStore`

## Methods

### commit()

```ts
commit(ops, expectedVersion): Promise<number>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ops` | [`ClaimOp`](/api/@rulvar/rulvar/type-aliases/ClaimOp.md)[] |
| `expectedVersion` | `number` |

#### Returns

`Promise`\&lt;`number`\&gt;

#### Implementation of

[`ModelKnowledgeStore`](/api/@rulvar/rulvar/interfaces/ModelKnowledgeStore.md).[`commit`](/api/@rulvar/rulvar/interfaces/ModelKnowledgeStore.md#commit)

***

### current()

```ts
current(): Promise<KnowledgeSnapshot>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

`Promise`\&lt;[`KnowledgeSnapshot`](/api/@rulvar/rulvar/interfaces/KnowledgeSnapshot.md)\&gt;

#### Implementation of

[`ModelKnowledgeStore`](/api/@rulvar/rulvar/interfaces/ModelKnowledgeStore.md).[`current`](/api/@rulvar/rulvar/interfaces/ModelKnowledgeStore.md#current)
