[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildLimitProfile

# Interface: AcceptanceChildLimitProfile

Defined in: [packages/core/src/orchestrator/orchestrate.ts:462](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L462)

The binding constraint profile of an acceptance roster (RV4906): what
ended the children, so an outcome can say "the tool cap bound, not
the money". The tenth comparison experiment's four specialists all
expired at maxToolCalls with 18 to 30 percent of their declared
budgets spent and no surface named it. Present on the journaled
acceptance decision, the result envelope, and a rejection's error
data exactly when at least one child ran under a tool budget;
`rulvar cost-audit` prints the same figures from the journal.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusedsharemedian"></a> `budgetUsedShareMedian?` | `number` | The median of spent over declared money across the children that declared any, rounded to three decimals; absent when none did. | [packages/core/src/orchestrator/orchestrate.ts:481](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L481) |
| <a id="property-caphit"></a> `capHit` | `number` | Children whose executed calls reached their effective cap. | [packages/core/src/orchestrator/orchestrate.ts:468](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L468) |
| <a id="property-children"></a> `children` | `number` | Children in the roster. | [packages/core/src/orchestrator/orchestrate.ts:464](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L464) |
| <a id="property-starved"></a> `starved` | `number` | Children that reached the cap with under half of their declared money spent (the spawn's `budgetUsd`, else the profile's `estCost`); a child with no declared money is never counted here. | [packages/core/src/orchestrator/orchestrate.ts:476](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L476) |
| <a id="property-undertoolbudget"></a> `underToolBudget` | `number` | Of those, the children that ran under a tool budget. | [packages/core/src/orchestrator/orchestrate.ts:466](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L466) |
| <a id="property-windowentered"></a> `windowEntered` | `number` | Children that entered the finalization window. | [packages/core/src/orchestrator/orchestrate.ts:470](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L470) |
