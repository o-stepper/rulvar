[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetExhaustionDiagnostics

# Interface: BudgetExhaustionDiagnostics

Defined in: [packages/core/src/engine/budget.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L129)

Why a ceiling error ended the work: the first closed account walking
from the debited scope toward the root, plus the root state, so the
outward message can name WHICH ceiling actually crossed instead of
blaming the run ceiling for every crossing.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-crossed"></a> `crossed?` | \{ `ceilingUsd`: `number`; `committedReserveUsd`: `number`; `finalizeReserveUsd`: `number`; `scope`: `string`; `source`: `"root"` \| `"orchestrator-cap"` \| `"child-account"`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L130) |
| `crossed.ceilingUsd` | `number` | [packages/core/src/engine/budget.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L133) |
| `crossed.committedReserveUsd` | `number` | [packages/core/src/engine/budget.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L135) |
| `crossed.finalizeReserveUsd` | `number` | [packages/core/src/engine/budget.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L136) |
| `crossed.scope` | `string` | [packages/core/src/engine/budget.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L131) |
| `crossed.source` | `"root"` \| `"orchestrator-cap"` \| `"child-account"` | [packages/core/src/engine/budget.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L132) |
| `crossed.spentUsd` | `number` | [packages/core/src/engine/budget.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L134) |
| <a id="property-root"></a> `root` | \{ `ceilingUsd?`: `number`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L138) |
| `root.ceilingUsd?` | `number` | [packages/core/src/engine/budget.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L138) |
| `root.spentUsd` | `number` | [packages/core/src/engine/budget.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L138) |
