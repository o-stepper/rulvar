[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ToolEffectLedger

# Interface: ToolEffectLedger

Defined in: [packages/executor/src/spi.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L102)

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

Defined in: [packages/executor/src/spi.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L116)

The two-phase capability (RV404): when the method is present, the
reference executors durably record the intent BEFORE the external
effect is dispatched (awaited; a failed write refuses the dispatch
with the typed `ledger` code) and the outcome `record` after it. A
host crash between the effect and the outcome row then leaves an
orphan intent, the reconciliation signal, instead of an untracked
effect: an intent whose OWN attempt has no outcome row (RV501)
means "look this key up with the effect's provider before retrying
or compensating". Absent, the ledger keeps the historical
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

Defined in: [packages/executor/src/spi.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L103)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`ToolEffectRecord`](/api/@rulvar/executor/interfaces/ToolEffectRecord.md) |

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;
