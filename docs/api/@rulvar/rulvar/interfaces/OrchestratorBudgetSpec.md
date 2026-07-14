[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestratorBudgetSpec

# Interface: OrchestratorBudgetSpec

Defined in: `packages/core/dist/index.d.ts`

Budget contract: https://docs.rulvar.com/guide/budgets; the cap
machinery (reserves, freeze) completes in M7 (DEF-7).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-atcap"></a> `atCap?` | `"finish-with-partial"` \| `"fail-run"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-capfraction"></a> `capFraction?` | `number` | default 0.2; effectiveCap = min of the given bounds | `packages/core/dist/index.d.ts` |
| <a id="property-capusd"></a> `capUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-finalizeturns"></a> `finalizeTurns?` | `number` | - | `packages/core/dist/index.d.ts` |
