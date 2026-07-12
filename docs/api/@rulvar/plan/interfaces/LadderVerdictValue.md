[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / LadderVerdictValue

# Interface: LadderVerdictValue

Defined in: [packages/plan/src/ladder.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L141)

The ladder verdict decision entry (docs/07, sections 10 and 11.3): the
producer contract both folds already consume. A RAISING verdict debits
one rung unit (rungIndexAfter/rungsRemainingAfter embedded, checked by
foldTermination) and carries the rung RESPAWN's embedded admission
(spawn debit) plus `nextAttempt` (the lineage registration: relation
'rung-retry', docs/03 10.1 row 4). A non-raising verdict records the
ladder's end (exhausted rungs, top rung, or a denied respawn) and
authorizes nothing.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissions"></a> `admissions?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)[] | The embedded respawn admission (the spawn debit; docs/07, 11.3 b). | [packages/plan/src/ladder.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L160) |
| <a id="property-attemptref"></a> `attemptRef` | `number` | The judged attempt's root dispatch seq. | [packages/plan/src/ladder.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L147) |
| <a id="property-decisiontype"></a> `decisionType` | `"ladder-verdict"` | - | [packages/plan/src/ladder.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L142) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/plan/src/ladder.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L143) |
| <a id="property-nextattempt"></a> `nextAttempt?` | \{ `childScope`: `string`; `lineage`: [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md); `rungIndex`: `number`; \} | Present exactly when raising: the authorized next rung attempt. | [packages/plan/src/ladder.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L152) |
| `nextAttempt.childScope` | `string` | - | [packages/plan/src/ladder.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L153) |
| `nextAttempt.lineage` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | The full admission-computed lineage block (registerAttempt input). | [packages/plan/src/ladder.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L155) |
| `nextAttempt.rungIndex` | `number` | The concrete rung the next attempt executes on. | [packages/plan/src/ladder.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L157) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/plan/src/ladder.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L144) |
| <a id="property-raisesrung"></a> `raisesRung` | `boolean` | - | [packages/plan/src/ladder.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L148) |
| <a id="property-reason"></a> `reason?` | \| `"rungs_exhausted"` \| `"top_rung"` \| `"respawn_denied"` \| `"trigger_not_declared"` | Non-raising verdicts: why the ladder ended here. | [packages/plan/src/ladder.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L162) |
| <a id="property-rungindexafter"></a> `rungIndexAfter?` | `number` | - | [packages/plan/src/ladder.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L149) |
| <a id="property-rungsremainingafter"></a> `rungsRemainingAfter?` | `number` | - | [packages/plan/src/ladder.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L150) |
| <a id="property-trigger"></a> `trigger` | [`TriggerClass`](/api/@rulvar/rulvar/type-aliases/TriggerClass.md) | - | [packages/plan/src/ladder.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L145) |
