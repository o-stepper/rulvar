[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetDefaults

# Interface: BudgetDefaults

Defined in: [packages/core/src/engine/engine.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L144)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childbudgetfraction"></a> `childBudgetFraction?` | `number` | Fraction of the parent remainder (minus the parent finalize reserve) a child sub-account may take; default 0.3 (M6-T06). | [packages/core/src/engine/engine.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L153) |
| <a id="property-flatreserveusd"></a> `flatReserveUsd?` | `number` | Last resort of the admission reserve formula; default 0.50. | [packages/core/src/engine/engine.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L146) |
| <a id="property-lifetimespawncap"></a> `lifetimeSpawnCap?` | `number` | Engine kill switch; default 500 spawns per run. | [packages/core/src/engine/engine.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L148) |
| <a id="property-lineage"></a> `lineage?` | `Partial`\&lt;[`EscalationLimits`](/api/@rulvar/core/interfaces/EscalationLimits.md)\&gt; | Lineage limits (DEF-3): maxEscalationsPerLogicalTask (default 2) and maxAttemptsPerLogicalTask (default 8), monotonically consumed. The validator rejects the pre-rename knob name maxEscalationsPerNode with a migration hint (XF-10). | [packages/core/src/engine/engine.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L162) |
| <a id="property-maxdepth"></a> `maxDepth?` | `number` | AdmissionController nesting depth; default 1, hard ceiling 4. | [packages/core/src/engine/engine.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L155) |
