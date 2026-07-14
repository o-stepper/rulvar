[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FileModelKnowledgeStore

# Class: FileModelKnowledgeStore

Defined in: [packages/core/src/knowledge/file-store.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/file-store.ts#L102)

The SPI seam. commit performs CAS on
the monotonic snapshot version, mirroring the fencing-epoch
discipline of LeasableStore; concurrent maintenance commits serialize
through CAS rejection and rebase. commit is UNREACHABLE from the
runtime: runs hold ModelKnowledgeHandle.

## Implements

- [`ModelKnowledgeStore`](/api/@rulvar/core/interfaces/ModelKnowledgeStore.md)

## Constructors

### Constructor

```ts
new FileModelKnowledgeStore(options?): FileModelKnowledgeStore;
```

Defined in: [packages/core/src/knowledge/file-store.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/file-store.ts#L108)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`FileModelKnowledgeStoreOptions`](/api/@rulvar/core/interfaces/FileModelKnowledgeStoreOptions.md) |

#### Returns

`FileModelKnowledgeStore`

## Methods

### commit()

```ts
commit(ops, expectedVersion): Promise<number>;
```

Defined in: [packages/core/src/knowledge/file-store.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/file-store.ts#L146)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ops` | [`ClaimOp`](/api/@rulvar/core/type-aliases/ClaimOp.md)[] |
| `expectedVersion` | `number` |

#### Returns

`Promise`\&lt;`number`\&gt;

#### Implementation of

[`ModelKnowledgeStore`](/api/@rulvar/core/interfaces/ModelKnowledgeStore.md).[`commit`](/api/@rulvar/core/interfaces/ModelKnowledgeStore.md#commit)

***

### current()

```ts
current(): Promise<KnowledgeSnapshot>;
```

Defined in: [packages/core/src/knowledge/file-store.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/file-store.ts#L142)

#### Returns

`Promise`\&lt;[`KnowledgeSnapshot`](/api/@rulvar/core/interfaces/KnowledgeSnapshot.md)\&gt;

#### Implementation of

[`ModelKnowledgeStore`](/api/@rulvar/core/interfaces/ModelKnowledgeStore.md).[`current`](/api/@rulvar/core/interfaces/ModelKnowledgeStore.md#current)
