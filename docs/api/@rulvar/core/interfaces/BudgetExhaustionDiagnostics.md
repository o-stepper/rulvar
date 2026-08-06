[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetExhaustionDiagnostics

# Interface: BudgetExhaustionDiagnostics

Defined in: [packages/core/src/engine/budget.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L158)

Why a ceiling error ended the work: the first closed account walking
from the debited scope toward the root, plus the root state, so the
outward message can name WHICH ceiling actually crossed instead of
blaming the run ceiling for every crossing.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-crossed"></a> `crossed?` | \{ `ceilingUsd`: `number`; `committedReserveUsd`: `number`; `finalizeReserveUsd`: `number`; `scope`: `string`; `source`: `"root"` \| `"orchestrator-cap"` \| `"child-account"`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L159) |
| `crossed.ceilingUsd` | `number` | [packages/core/src/engine/budget.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L162) |
| `crossed.committedReserveUsd` | `number` | [packages/core/src/engine/budget.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L164) |
| `crossed.finalizeReserveUsd` | `number` | [packages/core/src/engine/budget.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L165) |
| `crossed.scope` | `string` | [packages/core/src/engine/budget.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L160) |
| `crossed.source` | `"root"` \| `"orchestrator-cap"` \| `"child-account"` | [packages/core/src/engine/budget.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L161) |
| `crossed.spentUsd` | `number` | [packages/core/src/engine/budget.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L163) |
| <a id="property-root"></a> `root` | \{ `ceilingUsd?`: `number`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L167) |
| `root.ceilingUsd?` | `number` | [packages/core/src/engine/budget.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L167) |
| `root.spentUsd` | `number` | [packages/core/src/engine/budget.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L167) |
