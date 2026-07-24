[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / memoryEffectLedger

# Function: memoryEffectLedger()

```ts
function memoryEffectLedger(): ToolEffectLedger & {
  entries: readonly ToolEffectRecord[];
};
```

Defined in: [packages/executor/src/spi.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L78)

An in-memory ledger for tests and single-process hosts.

## Returns

[`ToolEffectLedger`](/api/@rulvar/executor/interfaces/ToolEffectLedger.md) & \{
  `entries`: readonly [`ToolEffectRecord`](/api/@rulvar/executor/interfaces/ToolEffectRecord.md)[];
\}
