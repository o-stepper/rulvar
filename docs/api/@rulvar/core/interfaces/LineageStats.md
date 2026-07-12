[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / LineageStats

# Interface: LineageStats

Defined in: [packages/core/src/journal/lineage.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L84)

The pure lineage fold rendered in plan_view and WakeDigest, always
pinned to a snapshot (`uptoSeq`), never a live read inside a turn.
`approaches` groups settled history by approachSig; a group whose
attempts have not settled yet is omitted (there is no outcome to learn
from), while `attemptsUsed` still counts every authorized attempt.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-approaches"></a> `approaches` | \{ `approachSig`: `string`; `approachTag`: `string`; `attempts`: `number`; `lastOutcome`: [`AttemptOutcomeClass`](/api/@rulvar/core/type-aliases/AttemptOutcomeClass.md); \}[] | [packages/core/src/journal/lineage.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L88) |
| <a id="property-attemptsused"></a> `attemptsUsed` | `number` | [packages/core/src/journal/lineage.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L85) |
| <a id="property-escalationsused"></a> `escalationsUsed` | `number` | [packages/core/src/journal/lineage.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L86) |
| <a id="property-stallstreak"></a> `stallStreak` | `number` | [packages/core/src/journal/lineage.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L87) |
