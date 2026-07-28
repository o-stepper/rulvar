[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / jsonlEffectLedger

# Function: jsonlEffectLedger()

```ts
function jsonlEffectLedger(path, options?): ToolEffectLedger;
```

Defined in: [packages/executor/src/ledger.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L84)

A two-phase ToolEffectLedger appending JSON lines to `path`
(`{ phase: 'intent' | 'outcome', ... }`). Pass it to
`subprocessExecutor({ ledger })` or `containerExecutor({ ledger })`;
scan it back with [loadEffectLedger](/api/@rulvar/executor/functions/loadEffectLedger.md). The first append lazily
repairs a torn tail left by a crashed predecessor (RV502).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |
| `options?` | \{ `now?`: () => `number`; \} |
| `options.now?` | () => `number` |

## Returns

[`ToolEffectLedger`](/api/@rulvar/executor/interfaces/ToolEffectLedger.md)
