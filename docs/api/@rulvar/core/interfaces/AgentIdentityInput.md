[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentIdentityInput

# Interface: AgentIdentityInput

Defined in: [packages/core/src/journal/identity.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L18)

Spawn entries: ctx.agent and orchestrator spawn tools (kind 'agent').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | - | [packages/core/src/journal/identity.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L20) |
| <a id="property-isolation"></a> `isolation` | [`IsolationSpec`](/api/@rulvar/core/type-aliases/IsolationSpec.md) | The canonical IsolationSpec encoding (see https://docs.rulvar.com/guide/tools). | [packages/core/src/journal/identity.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L32) |
| <a id="property-kind"></a> `kind` | `"agent"` | - | [packages/core/src/journal/identity.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L19) |
| <a id="property-modelspec"></a> `modelSpec` | [`CanonicalModelSpec`](/api/@rulvar/core/type-aliases/CanonicalModelSpec.md) | The REQUESTED model spec, including canonical effort where resolved; for laddered spawns it embeds the declared ladder together with startTier. | [packages/core/src/journal/identity.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L26) |
| <a id="property-prompt"></a> `prompt` | `string` | Replaced verbatim by opts.key when opts.key is set. | [packages/core/src/journal/identity.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L28) |
| <a id="property-schemahash"></a> `schemaHash` | `string` | - | [packages/core/src/journal/identity.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L29) |
| <a id="property-toolsethash"></a> `toolsetHash` | `string` | - | [packages/core/src/journal/identity.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L30) |
