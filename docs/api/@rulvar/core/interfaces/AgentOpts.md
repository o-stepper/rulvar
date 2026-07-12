[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentOpts

# Interface: AgentOpts\&lt;S\&gt;

Defined in: [packages/core/src/engine/ctx.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L153)

Per-spawn options (docs/06, section "ctx.agent and AgentOpts"). The
identity split is normative: agentType, model/routing/effort (the
requested modelSpec), schema (schemaHash), and key enter the content
key; everything else is policy or telemetry and never re-keys entries.
Fields whose machinery lands later (tools, isolation, escalation,
lineage, ladder, retry) arrive with their milestones.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md) | [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | - | [packages/core/src/engine/ctx.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L154) |
| <a id="property-approach"></a> `approach?` | `string` | Approach slug entering approachSig, normalized by the engine (DEF-3). | [packages/core/src/engine/ctx.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L203) |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Canonical effort, part of identity. | [packages/core/src/engine/ctx.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L169) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationOptions`](/api/@rulvar/core/interfaces/EscalationOptions.md) | Opt-in; without it 'escalated' is physically unproducible (docs/07 6.4). | [packages/core/src/engine/ctx.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L193) |
| <a id="property-estcost"></a> `estCost?` | `number` | Admission reserve hint (USD). | [packages/core/src/engine/ctx.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L205) |
| <a id="property-fallback"></a> `fallback?` | [`FallbackField`](/api/@rulvar/core/interfaces/FallbackField.md) | The degenerate fallback (docs/04, 11.3; M4-T04): an agent-level second attempt on `model` when the terminal matches `on`; one journaled decision entry; the fallback attempt is a NEW content key. | [packages/core/src/engine/ctx.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L187) |
| <a id="property-isolation"></a> `isolation?` | [`IsolationSpec`](/api/@rulvar/core/type-aliases/IsolationSpec.md) | docs/08; the RESOLVED value enters identity; worktree needs defaults.isolation. | [packages/core/src/engine/ctx.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L175) |
| <a id="property-key"></a> `key?` | `string` | Explicit discriminator; replaces the prompt in the content key. | [packages/core/src/engine/ctx.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L177) |
| <a id="property-label"></a> `label?` | `string` | Telemetry only. | [packages/core/src/engine/ctx.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L211) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | Merged over profile and engine limits (docs/06, section "UsageLimits"). | [packages/core/src/engine/ctx.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L207) |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/core/interfaces/SpawnLineageOpt.md) | Lineage continuation (DEF-3, docs/03 section 10.3): declares this spawn a rebirth of an existing logical task; absence means a new lineage root. Never enters the content key. Declaring lineage or approach journals a spawn-admission decision entry BEFORE dispatch, carrying the engine-minted LTID and the computed approach signature. | [packages/core/src/engine/ctx.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L201) |
| <a id="property-memoizeoutcome"></a> `memoizeOutcome?` | `boolean` | Journaled as a policy field from day one; consumed by the M2 predicate. | [packages/core/src/engine/ctx.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L191) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | Overrides all roles at once. | [packages/core/src/engine/ctx.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L165) |
| <a id="property-onerror"></a> `onError?` | `"null"` \| `"throw"` | - | [packages/core/src/engine/ctx.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L179) |
| <a id="property-replay"></a> `replay?` | `"cache"` \| `"never"` | Per-call replay mode; default scoped forward-matching (docs/03, section 7.3). | [packages/core/src/engine/ctx.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L189) |
| <a id="property-result"></a> `result?` | `"value"` \| `"full"` | - | [packages/core/src/engine/ctx.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L208) |
| <a id="property-retry"></a> `retry?` | [`RetryPolicy`](/api/@rulvar/core/interfaces/RetryPolicy.md) | Transport RetryPolicy under the journal (docs/04, 11.1; M4-T05). | [packages/core/src/engine/ctx.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L181) |
| <a id="property-role"></a> `role?` | `"orchestrate"` \| `"plan"` \| `"loop"` | The primary invocation role of the agent's tool loop; default 'loop'. The plan and orchestrate entry points set it so the resolution chain, role effort defaults, quality floors, and cost buckets see the right role; extract/finalize/summarize stay trigger-derived and are never settable here (docs/06, 2.1; M6-T05 amendment). | [packages/core/src/engine/ctx.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L163) |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt; | Per-role, wins over profile.routing. | [packages/core/src/engine/ctx.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L167) |
| <a id="property-schema"></a> `schema?` | `S` | schemaHash enters identity. | [packages/core/src/engine/ctx.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L171) |
| <a id="property-stream"></a> `stream?` | `boolean` | Enables agent:stream delta events. | [packages/core/src/engine/ctx.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L213) |
| <a id="property-tools"></a> `tools?` | [`ToolsOption`](/api/@rulvar/core/type-aliases/ToolsOption.md) | toolsetHash enters identity; wins over profile.tools (docs/08). | [packages/core/src/engine/ctx.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L173) |
