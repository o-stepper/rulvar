[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ExtensionDispatchSpec

# Interface: ExtensionDispatchSpec

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

A child dispatch under an explicit scope (plan/NodeId).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-approach"></a> `approach?` | `string` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-bootcheckpointref"></a> `bootCheckpointRef?` | `string` | A retained transcript checkpoint the dispatch boots from (park and unpark continuation, the DEF-5 graft boot; docs/03, sections 9.5 and 11.2). Dangling redispatch checkpoints take precedence. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationOptions`](/api/@rulvar/rulvar/interfaces/EscalationOptions.md) | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-isolation"></a> `isolation?` | [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md) | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-memoizeoutcome"></a> `memoizeOutcome?` | `boolean` | Rung/fallback opt-in (docs/04, section 12): a memoized terminal outcome replays by match instead of re-running live; the global default errors-re-run-live is preserved (DEF-1). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-model"></a> `model?` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `model`: `` `${string}:${string}` ``; \} | The CONCRETE model of this attempt: the ladder driver resolves each rung to its `{ model, effort }` form and dispatches with it, so the attempt's identity hash includes the concrete ModelRef (docs/07, section 10). The orchestrator itself never names models; only the engine-side driver populates this from the declared ladder. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `model.effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `model.model` | `` `${string}:${string}` `` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-outputschemaref"></a> `outputSchemaRef?` | `string` | Resolved against defaults.schemas (docs/08); unknown names are typed errors. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-prompt"></a> `prompt` | `string` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-schema"></a> `schema?` | `unknown` | An INLINE SchemaSpec for engine-synthesized children (the ladder judge verdict); user-authored plan specs use `outputSchemaRef` against the registry instead (docs/07, 4.2). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-taskclass"></a> `taskClass?` | `string` | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-toolsetref"></a> `toolsetRef?` | `string` | Resolved against defaults.toolsets (docs/08); unknown names are typed errors. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-usagelimits"></a> `usageLimits?` | `Partial`\&lt;[`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md)\&gt; | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
