[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / memoryEffectLedger

# Function: memoryEffectLedger()

```ts
function memoryEffectLedger(): ToolEffectLedger & {
  entries: readonly ToolEffectRecord[];
  intents: readonly ToolEffectIntent[];
};
```

Defined in: [packages/executor/src/spi.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L124)

An in-memory ledger for tests and single-process hosts. It implements
the two-phase capability: `intents()` exposes the pre-dispatch rows,
`entries()` the outcomes, exactly as before.

## Returns

[`ToolEffectLedger`](/api/@rulvar/executor/interfaces/ToolEffectLedger.md) & \{
  `entries`: readonly [`ToolEffectRecord`](/api/@rulvar/executor/interfaces/ToolEffectRecord.md)[];
  `intents`: readonly [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md)[];
\}
