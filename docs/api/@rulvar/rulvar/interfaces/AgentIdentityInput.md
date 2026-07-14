[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AgentIdentityInput

# Interface: AgentIdentityInput

Defined in: `packages/core/dist/index.d.ts`

Spawn entries: ctx.agent and orchestrator spawn tools (kind 'agent').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-isolation"></a> `isolation` | [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md) | The canonical IsolationSpec encoding (see https://docs.rulvar.com/guide/tools). | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `"agent"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-modelspec"></a> `modelSpec` | [`CanonicalModelSpec`](/api/@rulvar/rulvar/type-aliases/CanonicalModelSpec.md) | The REQUESTED model spec, including canonical effort where resolved; for laddered spawns it embeds the declared ladder together with startTier. | `packages/core/dist/index.d.ts` |
| <a id="property-prompt"></a> `prompt` | `string` | Replaced verbatim by opts.key when opts.key is set. | `packages/core/dist/index.d.ts` |
| <a id="property-schemahash"></a> `schemaHash` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-toolsethash"></a> `toolsetHash` | `string` | - | `packages/core/dist/index.d.ts` |
