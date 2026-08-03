[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetExhaustionDiagnostics

# Interface: BudgetExhaustionDiagnostics

Defined in: [packages/core/src/engine/budget.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L137)

Why a ceiling error ended the work: the first closed account walking
from the debited scope toward the root, plus the root state, so the
outward message can name WHICH ceiling actually crossed instead of
blaming the run ceiling for every crossing.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-crossed"></a> `crossed?` | \{ `ceilingUsd`: `number`; `committedReserveUsd`: `number`; `finalizeReserveUsd`: `number`; `scope`: `string`; `source`: `"root"` \| `"orchestrator-cap"` \| `"child-account"`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L138) |
| `crossed.ceilingUsd` | `number` | [packages/core/src/engine/budget.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L141) |
| `crossed.committedReserveUsd` | `number` | [packages/core/src/engine/budget.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L143) |
| `crossed.finalizeReserveUsd` | `number` | [packages/core/src/engine/budget.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L144) |
| `crossed.scope` | `string` | [packages/core/src/engine/budget.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L139) |
| `crossed.source` | `"root"` \| `"orchestrator-cap"` \| `"child-account"` | [packages/core/src/engine/budget.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L140) |
| `crossed.spentUsd` | `number` | [packages/core/src/engine/budget.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L142) |
| <a id="property-root"></a> `root` | \{ `ceilingUsd?`: `number`; `spentUsd`: `number`; \} | [packages/core/src/engine/budget.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L146) |
| `root.ceilingUsd?` | `number` | [packages/core/src/engine/budget.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L146) |
| `root.spentUsd` | `number` | [packages/core/src/engine/budget.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L146) |
