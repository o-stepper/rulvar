[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ToolEffectLedger

# Interface: ToolEffectLedger

Defined in: [packages/executor/src/spi.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L90)

The side-effect ledger seam. An executor calls `record` once per
dispatch (success or failure). Binding an approval to its effect is
then a lookup: the approval entry and the effect share
(runId, tool, argsHash), and the idempotency key is stable across a
rerun of the same call.

## Methods

### intent()?

```ts
optional intent(entry): void | Promise<void>;
```

Defined in: [packages/executor/src/spi.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L104)

The two-phase capability (RV404): when the method is present, the
reference executors durably record the intent BEFORE the external
effect is dispatched (awaited; a failed write refuses the dispatch
with the typed `ledger` code) and the outcome `record` after it. A
host crash between the effect and the outcome row then leaves an
orphan intent, the reconciliation signal, instead of an untracked
effect: an intent whose idempotency key has no outcome row means
"look this key up with the effect's provider before retrying or
compensating". Absent, the ledger keeps the historical
single-record contract and executor behavior is byte-identical.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md) |

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;

***

### record()

```ts
record(entry): void | Promise<void>;
```

Defined in: [packages/executor/src/spi.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L91)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`ToolEffectRecord`](/api/@rulvar/executor/interfaces/ToolEffectRecord.md) |

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;
