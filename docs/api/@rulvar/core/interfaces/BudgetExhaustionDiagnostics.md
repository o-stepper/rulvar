[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetExhaustionDiagnostics

# Interface: BudgetExhaustionDiagnostics

Defined in: [packages/core/src/engine/budget.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L118)

Why a ceiling error ended the work: the first closed account walking
from the debited scope toward the root, plus the root state, so the
outward message can name WHICH ceiling actually crossed instead of
blaming the run ceiling for every crossing.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-crossed"></a> `crossed?` | \{ `ceilingUsd`: `number`; `committedReserveUsd`: `number`; `finalizeReserveUsd`: `number`; `scope`: `string`; `source`: `"root"` \| `"orchestrator-cap"` \| `"child-account"`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L119) |
| `crossed.ceilingUsd` | `number` | [packages/core/src/engine/budget.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L122) |
| `crossed.committedReserveUsd` | `number` | [packages/core/src/engine/budget.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L124) |
| `crossed.finalizeReserveUsd` | `number` | [packages/core/src/engine/budget.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L125) |
| `crossed.scope` | `string` | [packages/core/src/engine/budget.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L120) |
| `crossed.source` | `"root"` \| `"orchestrator-cap"` \| `"child-account"` | [packages/core/src/engine/budget.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L121) |
| `crossed.spentUsd` | `number` | [packages/core/src/engine/budget.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L123) |
| <a id="property-root"></a> `root` | \{ `ceilingUsd?`: `number`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L127) |
| `root.ceilingUsd?` | `number` | [packages/core/src/engine/budget.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L127) |
| `root.spentUsd` | `number` | [packages/core/src/engine/budget.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L127) |
