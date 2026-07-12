[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunProfile

# Interface: RunProfile

Defined in: [packages/core/src/engine/run-profiles.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-profiles.ts#L17)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Default run budget ceiling in USD, when the host does not set one. | [packages/core/src/engine/run-profiles.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-profiles.ts#L23) |
| <a id="property-effortbyrole"></a> `effortByRole?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`Effort`](/api/@rulvar/core/type-aliases/Effort.md)\&gt;\&gt; | Per-role canonical effort hints (the model refs come from the host). | [packages/core/src/engine/run-profiles.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-profiles.ts#L19) |
| <a id="property-lifetimespawncap"></a> `lifetimeSpawnCap?` | `number` | Engine lifetime spawn cap (budgetDefaults.lifetimeSpawnCap). | [packages/core/src/engine/run-profiles.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-profiles.ts#L27) |
| <a id="property-maxdepth"></a> `maxDepth?` | `number` | Nesting depth ceiling (budgetDefaults.maxDepth). | [packages/core/src/engine/run-profiles.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-profiles.ts#L29) |
| <a id="property-permissionpreset"></a> `permissionPreset?` | [`PermissionPreset`](/api/@rulvar/core/type-aliases/PermissionPreset.md) | Permission preset applied to the engine-wide chain. | [packages/core/src/engine/run-profiles.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-profiles.ts#L25) |
| <a id="property-perrunconcurrency"></a> `perRunConcurrency?` | `number` | Per-run concurrency width (createEngine concurrency.perRun). | [packages/core/src/engine/run-profiles.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-profiles.ts#L21) |
