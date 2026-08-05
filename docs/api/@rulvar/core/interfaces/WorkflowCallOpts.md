[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WorkflowCallOpts

# Interface: WorkflowCallOpts

Defined in: [packages/core/src/engine/ctx.ts:612](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L612)

Options of ctx.workflow; `key` replaces args in the child identity.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approach"></a> `approach?` | `string` | Approach slug entering approachSig (DEF-3). | [packages/core/src/engine/ctx.ts:617](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L617) |
| <a id="property-key"></a> `key?` | `string` | - | [packages/core/src/engine/ctx.ts:613](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L613) |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/core/interfaces/SpawnLineageOpt.md) | Lineage continuation (DEF-3); embedded in the admission decision entry. | [packages/core/src/engine/ctx.ts:615](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L615) |
