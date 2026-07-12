[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelKnowledgeStore

# Interface: ModelKnowledgeStore

Defined in: [packages/core/src/l0/spi/knowledge.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L135)

The SPI seam (docs/05, section "Data model"). commit performs CAS on
the monotonic snapshot version, mirroring the fencing-epoch
discipline of LeasableStore; concurrent maintenance commits serialize
through CAS rejection and rebase. commit is UNREACHABLE from the
runtime: runs hold ModelKnowledgeHandle.

## Methods

### commit()

```ts
commit(ops, expectedVersion): Promise<number>;
```

Defined in: [packages/core/src/l0/spi/knowledge.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L137)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ops` | [`ClaimOp`](/api/@rulvar/core/type-aliases/ClaimOp.md)[] |
| `expectedVersion` | `number` |

#### Returns

`Promise`\&lt;`number`\&gt;

***

### current()

```ts
current(): Promise<KnowledgeSnapshot>;
```

Defined in: [packages/core/src/l0/spi/knowledge.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L136)

#### Returns

`Promise`\&lt;[`KnowledgeSnapshot`](/api/@rulvar/core/interfaces/KnowledgeSnapshot.md)\&gt;
