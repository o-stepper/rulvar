[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / LineageStats

# Interface: LineageStats

Defined in: `packages/core/dist/index.d.ts`

The pure lineage fold rendered in plan_view and WakeDigest, always
pinned to a snapshot (`uptoSeq`), never a live read inside a turn.
`approaches` groups settled history by approachSig; a group whose
attempts have not settled yet is omitted (there is no outcome to learn
from), while `attemptsUsed` still counts every authorized attempt.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-approaches"></a> `approaches` | \{ `approachSig`: `string`; `approachTag`: `string`; `attempts`: `number`; `lastOutcome`: [`AttemptOutcomeClass`](/api/@rulvar/rulvar/type-aliases/AttemptOutcomeClass.md); \}[] | `packages/core/dist/index.d.ts` |
| <a id="property-attemptsused"></a> `attemptsUsed` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-escalationsused"></a> `escalationsUsed` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-stallstreak"></a> `stallStreak` | `number` | `packages/core/dist/index.d.ts` |
