[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetExhaustionDiagnostics

# Interface: BudgetExhaustionDiagnostics

Defined in: [packages/core/src/engine/budget.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L102)

Why a ceiling error ended the work: the first closed account walking
from the debited scope toward the root, plus the root state, so the
outward message can name WHICH ceiling actually crossed instead of
blaming the run ceiling for every crossing.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-crossed"></a> `crossed?` | \{ `ceilingUsd`: `number`; `committedReserveUsd`: `number`; `finalizeReserveUsd`: `number`; `scope`: `string`; `source`: `"root"` \| `"orchestrator-cap"` \| `"child-account"`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L103) |
| `crossed.ceilingUsd` | `number` | [packages/core/src/engine/budget.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L106) |
| `crossed.committedReserveUsd` | `number` | [packages/core/src/engine/budget.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L108) |
| `crossed.finalizeReserveUsd` | `number` | [packages/core/src/engine/budget.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L109) |
| `crossed.scope` | `string` | [packages/core/src/engine/budget.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L104) |
| `crossed.source` | `"root"` \| `"orchestrator-cap"` \| `"child-account"` | [packages/core/src/engine/budget.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L105) |
| `crossed.spentUsd` | `number` | [packages/core/src/engine/budget.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L107) |
| <a id="property-root"></a> `root` | \{ `ceilingUsd?`: `number`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L111) |
| `root.ceilingUsd?` | `number` | [packages/core/src/engine/budget.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L111) |
| `root.spentUsd` | `number` | [packages/core/src/engine/budget.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L111) |
