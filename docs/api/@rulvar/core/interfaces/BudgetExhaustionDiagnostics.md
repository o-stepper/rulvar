[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetExhaustionDiagnostics

# Interface: BudgetExhaustionDiagnostics

Defined in: [packages/core/src/engine/budget.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L145)

Why a ceiling error ended the work: the first closed account walking
from the debited scope toward the root, plus the root state, so the
outward message can name WHICH ceiling actually crossed instead of
blaming the run ceiling for every crossing.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-crossed"></a> `crossed?` | \{ `ceilingUsd`: `number`; `committedReserveUsd`: `number`; `finalizeReserveUsd`: `number`; `scope`: `string`; `source`: `"root"` \| `"orchestrator-cap"` \| `"child-account"`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L146) |
| `crossed.ceilingUsd` | `number` | [packages/core/src/engine/budget.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L149) |
| `crossed.committedReserveUsd` | `number` | [packages/core/src/engine/budget.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L151) |
| `crossed.finalizeReserveUsd` | `number` | [packages/core/src/engine/budget.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L152) |
| `crossed.scope` | `string` | [packages/core/src/engine/budget.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L147) |
| `crossed.source` | `"root"` \| `"orchestrator-cap"` \| `"child-account"` | [packages/core/src/engine/budget.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L148) |
| `crossed.spentUsd` | `number` | [packages/core/src/engine/budget.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L150) |
| <a id="property-root"></a> `root` | \{ `ceilingUsd?`: `number`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L154) |
| `root.ceilingUsd?` | `number` | [packages/core/src/engine/budget.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L154) |
| `root.spentUsd` | `number` | [packages/core/src/engine/budget.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L154) |
