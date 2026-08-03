[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WorkflowCallOpts

# Interface: WorkflowCallOpts

Defined in: [packages/core/src/engine/ctx.ts:603](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L603)

Options of ctx.workflow; `key` replaces args in the child identity.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approach"></a> `approach?` | `string` | Approach slug entering approachSig (DEF-3). | [packages/core/src/engine/ctx.ts:608](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L608) |
| <a id="property-key"></a> `key?` | `string` | - | [packages/core/src/engine/ctx.ts:604](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L604) |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/core/interfaces/SpawnLineageOpt.md) | Lineage continuation (DEF-3); embedded in the admission decision entry. | [packages/core/src/engine/ctx.ts:606](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L606) |
