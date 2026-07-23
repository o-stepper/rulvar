[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AgentOpts

# Interface: AgentOpts\&lt;S\&gt;

Defined in: `packages/core/dist/index.d.ts`

Per-spawn options. The
identity split is normative: agentType, model/routing/effort (the
requested modelSpec), schema (schemaHash), and key enter the content
key; everything else is policy or telemetry and never re-keys entries.
Fields whose machinery lands later (tools, isolation, escalation,
lineage, ladder, retry) arrive with their milestones.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) | [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-approach"></a> `approach?` | `string` | Approach slug entering approachSig, normalized by the engine (DEF-3). | `packages/core/dist/index.d.ts` |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | Canonical effort, part of identity. | `packages/core/dist/index.d.ts` |
| <a id="property-escalation"></a> `escalation?` | [`EscalationOptions`](/api/@rulvar/rulvar/interfaces/EscalationOptions.md) | Opt-in; without it 'escalated' is physically unproducible. | `packages/core/dist/index.d.ts` |
| <a id="property-estcost"></a> `estCost?` | `number` | Admission reserve hint (USD). | `packages/core/dist/index.d.ts` |
| <a id="property-fallback"></a> `fallback?` | [`FallbackField`](/api/@rulvar/rulvar/interfaces/FallbackField.md) | The degenerate fallback (M4-T04): an agent-level second attempt on `model` when the terminal matches `on`; one journaled decision entry; the fallback attempt is a NEW content key. | `packages/core/dist/index.d.ts` |
| <a id="property-isolation"></a> `isolation?` | [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md) | The RESOLVED value enters identity; worktree needs defaults.isolation. | `packages/core/dist/index.d.ts` |
| <a id="property-key"></a> `key?` | `string` | Explicit discriminator; replaces the prompt in the content key. | `packages/core/dist/index.d.ts` |
| <a id="property-label"></a> `label?` | `string` | Telemetry only. | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | Merged over profile and engine limits. | `packages/core/dist/index.d.ts` |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineageOpt`](/api/@rulvar/rulvar/interfaces/SpawnLineageOpt.md) | Lineage continuation (DEF-3): declares this spawn a rebirth of an existing logical task; absence means a new lineage root. Never enters the content key. Declaring lineage or approach journals a spawn-admission decision entry BEFORE dispatch, carrying the engine-minted LTID and the computed approach signature. | `packages/core/dist/index.d.ts` |
| <a id="property-memoizeoutcome"></a> `memoizeOutcome?` | `boolean` | Journaled as a policy field from day one; consumed by the M2 predicate. | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | Overrides all roles at once. | `packages/core/dist/index.d.ts` |
| <a id="property-onerror"></a> `onError?` | `"throw"` \| `"null"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-replay"></a> `replay?` | `"cache"` \| `"never"` | Per-call replay mode; default scoped forward-matching. | `packages/core/dist/index.d.ts` |
| <a id="property-result"></a> `result?` | `"value"` \| `"full"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-retry"></a> `retry?` | [`RetryPolicy`](/api/@rulvar/rulvar/interfaces/RetryPolicy.md) | Transport RetryPolicy under the journal (M4-T05). | `packages/core/dist/index.d.ts` |
| <a id="property-role"></a> `role?` | `"orchestrate"` \| `"plan"` \| `"loop"` \| `"synthesize"` | The primary invocation role of the agent's tool loop; default 'loop'. The plan and orchestrate entry points set it so the resolution chain, role effort defaults, quality floors, and cost buckets see the right role, and the orchestrator's post-fan-in synthesis invocation (RV-211) runs as 'synthesize'; extract/finalize/summarize stay trigger-derived and are never settable here (M6-T05 amendment). | `packages/core/dist/index.d.ts` |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt; | Per-role, wins over profile.routing. | `packages/core/dist/index.d.ts` |
| <a id="property-schema"></a> `schema?` | `S` | schemaHash enters identity. | `packages/core/dist/index.d.ts` |
| <a id="property-stream"></a> `stream?` | `boolean` | Enables agent:stream delta events. | `packages/core/dist/index.d.ts` |
| <a id="property-tools"></a> `tools?` | [`ToolsOption`](/api/@rulvar/rulvar/type-aliases/ToolsOption.md) | toolsetHash enters identity; wins over profile.tools. | `packages/core/dist/index.d.ts` |
