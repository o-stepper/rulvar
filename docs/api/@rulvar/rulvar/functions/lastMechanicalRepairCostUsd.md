[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / lastMechanicalRepairCostUsd

# Function: lastMechanicalRepairCostUsd()

```ts
function lastMechanicalRepairCostUsd(entries, priceUsd?): number | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

The observed price of the run's LAST mechanical repair turn
(RV3802): the window of the candidate that FOLLOWED a 'repair'
verdict inside the same settled synthesize span, priced by the same
per-call fold every candidate window uses. This is the fallback the
repair round's mechanical money leg sizes itself from when the host
declared no estimate: by the time the round is admitted the initial
composition has settled, so a mechanical repair it performed is a
priced window in the journal. Fail closed under RV1209: no such
pairing, an unattributed span, or an unpriceable window all return
undefined (never a guessed number), and the caller treats undefined
as an inert zero-size leg.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` |

## Returns

`number` \| `undefined`
