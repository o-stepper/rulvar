[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / BudgetExhaustionDiagnostics

# Interface: BudgetExhaustionDiagnostics

Defined in: `packages/core/dist/index.d.ts`

Why a ceiling error ended the work: the first closed account walking
from the debited scope toward the root, plus the root state, so the
outward message can name WHICH ceiling actually crossed instead of
blaming the run ceiling for every crossing.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-crossed"></a> `crossed?` | \{ `ceilingUsd`: `number`; `committedReserveUsd`: `number`; `finalizeReserveUsd`: `number`; `scope`: `string`; `source`: `"root"` \| `"orchestrator-cap"` \| `"child-account"`; `spentUsd`: `number`; \} | `packages/core/dist/index.d.ts` |
| `crossed.ceilingUsd` | `number` | `packages/core/dist/index.d.ts` |
| `crossed.committedReserveUsd` | `number` | `packages/core/dist/index.d.ts` |
| `crossed.finalizeReserveUsd` | `number` | `packages/core/dist/index.d.ts` |
| `crossed.scope` | `string` | `packages/core/dist/index.d.ts` |
| `crossed.source` | `"root"` \| `"orchestrator-cap"` \| `"child-account"` | `packages/core/dist/index.d.ts` |
| `crossed.spentUsd` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-root"></a> `root` | \{ `ceilingUsd?`: `number`; `spentUsd`: `number`; \} | `packages/core/dist/index.d.ts` |
| `root.ceilingUsd?` | `number` | `packages/core/dist/index.d.ts` |
| `root.spentUsd` | `number` | `packages/core/dist/index.d.ts` |
