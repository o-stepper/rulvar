[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / jsonlEffectLedger

# Function: jsonlEffectLedger()

```ts
function jsonlEffectLedger(path, options?): ToolEffectLedger;
```

Defined in: [packages/executor/src/ledger.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/ledger.ts#L199)

A two-phase ToolEffectLedger appending JSON lines to `path`
(`{ phase: 'intent' | 'outcome', ... }`). Pass it to
`subprocessExecutor({ ledger })` or `containerExecutor({ ledger })`;
scan it back with [loadEffectLedger](/api/@rulvar/executor/functions/loadEffectLedger.md). The first append lazily
repairs a torn tail left by a crashed predecessor (RV502).

Writer contract (RV606), stated publicly: appends are whole-line
O_APPEND writes, and the destructive tail repair is mutually
exclusive across processes (a sidecar `<path>.repair-lock` taken with
O_EXCL, the file re-read after capture, a stale lock stolen after a
ten-second TTL), so several writer processes on one LOCAL path can no
longer truncate away each other's confirmed rows while repairing.
Still, prefer ONE WRITER PER PATH, a `effects.<worker>.jsonl` file
per worker process merged at reconciliation time: per-line append
atomicity is a local-filesystem property, and neither O_APPEND nor
O_EXCL is dependable on network filesystems.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |
| `options?` | \{ `now?`: () => `number`; \} |
| `options.now?` | () => `number` |

## Returns

[`ToolEffectLedger`](/api/@rulvar/executor/interfaces/ToolEffectLedger.md)
