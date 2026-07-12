[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunProfile

# Interface: RunProfile

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Default run budget ceiling in USD, when the host does not set one. | `packages/core/dist/index.d.ts` |
| <a id="property-effortbyrole"></a> `effortByRole?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md)\&gt;\&gt; | Per-role canonical effort hints (the model refs come from the host). | `packages/core/dist/index.d.ts` |
| <a id="property-lifetimespawncap"></a> `lifetimeSpawnCap?` | `number` | Engine lifetime spawn cap (budgetDefaults.lifetimeSpawnCap). | `packages/core/dist/index.d.ts` |
| <a id="property-maxdepth"></a> `maxDepth?` | `number` | Nesting depth ceiling (budgetDefaults.maxDepth). | `packages/core/dist/index.d.ts` |
| <a id="property-permissionpreset"></a> `permissionPreset?` | [`PermissionPreset`](/api/@rulvar/rulvar/type-aliases/PermissionPreset.md) | Permission preset applied to the engine-wide chain. | `packages/core/dist/index.d.ts` |
| <a id="property-perrunconcurrency"></a> `perRunConcurrency?` | `number` | Per-run concurrency width (createEngine concurrency.perRun). | `packages/core/dist/index.d.ts` |
