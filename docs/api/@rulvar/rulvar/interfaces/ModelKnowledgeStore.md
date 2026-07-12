[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ModelKnowledgeStore

# Interface: ModelKnowledgeStore

Defined in: `packages/core/dist/index.d.ts`

The SPI seam. commit performs CAS on
the monotonic snapshot version, mirroring the fencing-epoch
discipline of LeasableStore; concurrent maintenance commits serialize
through CAS rejection and rebase. commit is UNREACHABLE from the
runtime: runs hold ModelKnowledgeHandle.

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

***

### current()

```ts
current(): Promise<KnowledgeSnapshot>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

`Promise`\&lt;[`KnowledgeSnapshot`](/api/@rulvar/rulvar/interfaces/KnowledgeSnapshot.md)\&gt;
