[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetExhaustionDiagnostics

# Interface: BudgetExhaustionDiagnostics

Defined in: [packages/core/src/engine/budget.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L165)

Why a ceiling error ended the work: the first closed account walking
from the debited scope toward the root, plus the root state, so the
outward message can name WHICH ceiling actually crossed instead of
blaming the run ceiling for every crossing.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-crossed"></a> `crossed?` | \{ `ceilingUsd`: `number`; `committedReserveUsd`: `number`; `finalizeReserveUsd`: `number`; `scope`: `string`; `source`: `"root"` \| `"orchestrator-cap"` \| `"child-account"`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L166) |
| `crossed.ceilingUsd` | `number` | [packages/core/src/engine/budget.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L169) |
| `crossed.committedReserveUsd` | `number` | [packages/core/src/engine/budget.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L171) |
| `crossed.finalizeReserveUsd` | `number` | [packages/core/src/engine/budget.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L172) |
| `crossed.scope` | `string` | [packages/core/src/engine/budget.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L167) |
| `crossed.source` | `"root"` \| `"orchestrator-cap"` \| `"child-account"` | [packages/core/src/engine/budget.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L168) |
| `crossed.spentUsd` | `number` | [packages/core/src/engine/budget.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L170) |
| <a id="property-root"></a> `root` | \{ `ceilingUsd?`: `number`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L174) |
| `root.ceilingUsd?` | `number` | [packages/core/src/engine/budget.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L174) |
| `root.spentUsd` | `number` | [packages/core/src/engine/budget.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L174) |
