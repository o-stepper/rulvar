[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExtensionDispatchSpec

# Interface: ExtensionDispatchSpec

Defined in: [packages/core/src/orchestrator/extension.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L39)

A child dispatch under an explicit scope (plan/NodeId).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | - | [packages/core/src/orchestrator/extension.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L40) |
| <a id="property-approach"></a> `approach?` | `string` | - | [packages/core/src/orchestrator/extension.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L50) |
| <a id="property-bootcheckpointref"></a> `bootCheckpointRef?` | `string` | A retained transcript checkpoint the dispatch boots from (park and unpark continuation, the DEF-5 graft boot; docs/03, sections 9.5 and 11.2). Dangling redispatch checkpoints take precedence. | [packages/core/src/orchestrator/extension.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L57) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | - | [packages/core/src/orchestrator/extension.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L47) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationOptions`](/api/@rulvar/core/interfaces/EscalationOptions.md) | - | [packages/core/src/orchestrator/extension.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L49) |
| <a id="property-isolation"></a> `isolation?` | [`IsolationSpec`](/api/@rulvar/core/type-aliases/IsolationSpec.md) | - | [packages/core/src/orchestrator/extension.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L46) |
| <a id="property-memoizeoutcome"></a> `memoizeOutcome?` | `boolean` | Rung/fallback opt-in (docs/04, section 12): a memoized terminal outcome replays by match instead of re-running live; the global default errors-re-run-live is preserved (DEF-1). | [packages/core/src/orchestrator/extension.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L71) |
| <a id="property-model"></a> `model?` | \{ `effort?`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `model`: `` `${string}:${string}` ``; \} | The CONCRETE model of this attempt: the ladder driver resolves each rung to its `{ model, effort }` form and dispatches with it, so the attempt's identity hash includes the concrete ModelRef (docs/07, section 10). The orchestrator itself never names models; only the engine-side driver populates this from the declared ladder. | [packages/core/src/orchestrator/extension.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L65) |
| `model.effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | - | [packages/core/src/orchestrator/extension.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L65) |
| `model.model` | `` `${string}:${string}` `` | - | [packages/core/src/orchestrator/extension.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L65) |
| <a id="property-outputschemaref"></a> `outputSchemaRef?` | `string` | Resolved against defaults.schemas (docs/08); unknown names are typed errors. | [packages/core/src/orchestrator/extension.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L43) |
| <a id="property-prompt"></a> `prompt` | `string` | - | [packages/core/src/orchestrator/extension.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L41) |
| <a id="property-schema"></a> `schema?` | `unknown` | An INLINE SchemaSpec for engine-synthesized children (the ladder judge verdict); user-authored plan specs use `outputSchemaRef` against the registry instead (docs/07, 4.2). | [packages/core/src/orchestrator/extension.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L77) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | - | [packages/core/src/orchestrator/extension.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L51) |
| <a id="property-toolsetref"></a> `toolsetRef?` | `string` | Resolved against defaults.toolsets (docs/08); unknown names are typed errors. | [packages/core/src/orchestrator/extension.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L45) |
| <a id="property-usagelimits"></a> `usageLimits?` | `Partial`\&lt;[`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md)\&gt; | - | [packages/core/src/orchestrator/extension.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L48) |
