[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / readEffectLaneDecision

# Function: readEffectLaneDecision()

```ts
function readEffectLaneDecision(entry): EffectLaneRead;
```

Defined in: `packages/core/dist/index.d.ts`

Reads one journal entry as an effect lane decision, fail closed: an
entry that is not a kind-'decision' entry with a lane decisionType is
not lane traffic; a lane decisionType whose payload fails validation
reads `malformed` and participates in NOTHING (a hand-written broken
row must never confuse the machine). `approval_expired` is read by
the fold directly (it targets approvals, not machines).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

## Returns

[`EffectLaneRead`](/api/@rulvar/rulvar/type-aliases/EffectLaneRead.md)
