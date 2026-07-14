[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / WorkflowCallOpts

# Interface: WorkflowCallOpts

Defined in: `packages/core/dist/index.d.ts`

Options of ctx.workflow; `key` replaces args in the child identity.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approach"></a> `approach?` | `string` | Approach slug entering approachSig (DEF-3). | `packages/core/dist/index.d.ts` |
| <a id="property-key"></a> `key?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/rulvar/interfaces/SpawnLineageOpt.md) | Lineage continuation (DEF-3); embedded in the admission decision entry. | `packages/core/dist/index.d.ts` |
