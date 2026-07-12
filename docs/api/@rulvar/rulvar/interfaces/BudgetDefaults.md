[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / BudgetDefaults

# Interface: BudgetDefaults

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childbudgetfraction"></a> `childBudgetFraction?` | `number` | Fraction of the parent remainder (minus the parent finalize reserve) a child sub-account may take; default 0.3 (M6-T06). | `packages/core/dist/index.d.ts` |
| <a id="property-flatreserveusd"></a> `flatReserveUsd?` | `number` | Last resort of the admission reserve formula; default 0.50. | `packages/core/dist/index.d.ts` |
| <a id="property-lifetimespawncap"></a> `lifetimeSpawnCap?` | `number` | Engine kill switch; default 500 spawns per run. | `packages/core/dist/index.d.ts` |
| <a id="property-lineage"></a> `lineage?` | `Partial`\&lt;[`EscalationLimits`](/api/@rulvar/rulvar/interfaces/EscalationLimits.md)\&gt; | Lineage limits (DEF-3): maxEscalationsPerLogicalTask (default 2) and maxAttemptsPerLogicalTask (default 8), monotonically consumed. The validator rejects the pre-rename knob name maxEscalationsPerNode with a migration hint (XF-10). | `packages/core/dist/index.d.ts` |
| <a id="property-maxdepth"></a> `maxDepth?` | `number` | AdmissionController nesting depth; default 1, hard ceiling 4. | `packages/core/dist/index.d.ts` |
