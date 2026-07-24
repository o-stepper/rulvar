[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ToolEffectLedger

# Interface: ToolEffectLedger

Defined in: [packages/executor/src/spi.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L73)

The side-effect ledger seam. An executor calls `record` once per
dispatch (success or failure). Binding an approval to its effect is
then a lookup: the approval entry and the effect share
(runId, tool, argsHash), and the idempotency key is stable across a
rerun of the same call.

## Methods

### record()

```ts
record(entry): void | Promise<void>;
```

Defined in: [packages/executor/src/spi.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L74)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`ToolEffectRecord`](/api/@rulvar/executor/interfaces/ToolEffectRecord.md) |

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;
