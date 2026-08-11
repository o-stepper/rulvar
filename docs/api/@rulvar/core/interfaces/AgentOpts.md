[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentOpts

# Interface: AgentOpts\&lt;S\&gt;

Defined in: [packages/core/src/engine/ctx.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L267)

Per-spawn options. The
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
| <a id="property-agenttype"></a> `agentType?` | `string` | - | [packages/core/src/engine/ctx.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L268) |
| <a id="property-approach"></a> `approach?` | `string` | Approach slug entering approachSig, normalized by the engine (DEF-3). | [packages/core/src/engine/ctx.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L318) |
| <a id="property-cache"></a> `cache?` | [`CachePolicy`](/api/@rulvar/core/interfaces/CachePolicy.md) | The prompt-cache policy for THIS call (RV2006); wins over profile and engine. | [packages/core/src/engine/ctx.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L324) |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Canonical effort, part of identity. | [packages/core/src/engine/ctx.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L284) |
| <a id="property-escalation"></a> `escalation?` | [`EscalationOptions`](/api/@rulvar/core/interfaces/EscalationOptions.md) | Opt-in; without it 'escalated' is physically unproducible. | [packages/core/src/engine/ctx.ts:308](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L308) |
| <a id="property-estcost"></a> `estCost?` | `number` | Admission reserve hint (USD). | [packages/core/src/engine/ctx.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L320) |
| <a id="property-fallback"></a> `fallback?` | [`FallbackField`](/api/@rulvar/core/interfaces/FallbackField.md) | The degenerate fallback (M4-T04): an agent-level second attempt on `model` when the terminal matches `on`; one journaled decision entry; the fallback attempt is a NEW content key. | [packages/core/src/engine/ctx.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L302) |
| <a id="property-isolation"></a> `isolation?` | [`IsolationSpec`](/api/@rulvar/core/type-aliases/IsolationSpec.md) | The RESOLVED value enters identity; worktree needs defaults.isolation. | [packages/core/src/engine/ctx.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L290) |
| <a id="property-key"></a> `key?` | `string` | Explicit discriminator; replaces the prompt in the content key. | [packages/core/src/engine/ctx.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L292) |
| <a id="property-label"></a> `label?` | `string` | Telemetry only. | [packages/core/src/engine/ctx.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L328) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | Merged over profile and engine limits. | [packages/core/src/engine/ctx.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L322) |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/core/interfaces/SpawnLineageOpt.md) | Lineage continuation (DEF-3): declares this spawn a rebirth of an existing logical task; absence means a new lineage root. Never enters the content key. Declaring lineage or approach journals a spawn-admission decision entry BEFORE dispatch, carrying the engine-minted LTID and the computed approach signature. | [packages/core/src/engine/ctx.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L316) |
| <a id="property-memoizeoutcome"></a> `memoizeOutcome?` | `boolean` | Journaled as a policy field from day one; consumed by the M2 predicate. | [packages/core/src/engine/ctx.ts:306](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L306) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | Overrides all roles at once. | [packages/core/src/engine/ctx.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L280) |
| <a id="property-onerror"></a> `onError?` | `"throw"` \| `"null"` | - | [packages/core/src/engine/ctx.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L294) |
| <a id="property-replay"></a> `replay?` | `"cache"` \| `"never"` | Per-call replay mode; default scoped forward-matching. | [packages/core/src/engine/ctx.ts:304](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L304) |
| <a id="property-result"></a> `result?` | `"full"` \| `"value"` | - | [packages/core/src/engine/ctx.ts:325](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L325) |
| <a id="property-retry"></a> `retry?` | [`RetryPolicy`](/api/@rulvar/core/interfaces/RetryPolicy.md) | Transport RetryPolicy under the journal (M4-T05). | [packages/core/src/engine/ctx.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L296) |
| <a id="property-role"></a> `role?` | `"orchestrate"` \| `"plan"` \| `"loop"` \| `"synthesize"` | The primary invocation role of the agent's tool loop; default 'loop'. The plan and orchestrate entry points set it so the resolution chain, role effort defaults, quality floors, and cost buckets see the right role, and the orchestrator's post-fan-in synthesis invocation (RV-211) runs as 'synthesize'; extract/finalize/summarize stay trigger-derived and are never settable here (M6-T05 amendment). | [packages/core/src/engine/ctx.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L278) |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt; | Per-role, wins over profile.routing. | [packages/core/src/engine/ctx.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L282) |
| <a id="property-schema"></a> `schema?` | `S` | schemaHash enters identity. | [packages/core/src/engine/ctx.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L286) |
| <a id="property-stream"></a> `stream?` | `boolean` | Enables agent:stream delta events. | [packages/core/src/engine/ctx.ts:330](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L330) |
| <a id="property-tools"></a> `tools?` | [`ToolsOption`](/api/@rulvar/core/type-aliases/ToolsOption.md) | toolsetHash enters identity; wins over profile.tools. | [packages/core/src/engine/ctx.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L288) |
