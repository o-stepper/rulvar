[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PreflightSpawnSpec

# Interface: PreflightSpawnSpec

Defined in: `packages/core/dist/index.d.ts`

One intended spawn of the wave under estimation: the same layers the
engine reads at ctx.agent time (call limits over profile limits over
engine defaults; call estCost over profile estCost over the priced
estimate over the flat default), plus the two stand-ins a static
estimate needs: `estInputTokens` replaces the adapter countTokens the
runtime would call over the real prompt, and `count` declares how
many spawns of this shape the first wave holds.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | The spawn's explicit budget, exactly the spawn_agent `budgetUsd` param. Consumed by the layer-2 spawn-gate projection only (the shared `dispatchProjectionReserveUsd` clamp); a dynamic spawn's budget never becomes an account, so the layer-1 chain reserve is NOT clamped by it, exactly like the runtime. | `packages/core/dist/index.d.ts` |
| <a id="property-count"></a> `count?` | `number` | How many spawns of this shape the wave declares; default 1. | `packages/core/dist/index.d.ts` |
| <a id="property-estcost"></a> `estCost?` | `number` | The declared admission estimate. In a PLAIN wave this is AgentOpts.estCost verbatim. In an orchestrate wave (an `orchestrator` spec is present) a spawn tool has no per-call estCost channel, so declare the agentType PROFILE's estimate here: the layer-2 spawn gate evaluates exactly that (or the flat default), never the priced estimate. | `packages/core/dist/index.d.ts` |
| <a id="property-estinputtokens"></a> `estInputTokens?` | `number` | The prompt-size stand-in for the runtime's adapter countTokens: feeds the priced admission estimate and the per-turn and quota exposure floors. Absent, the reserve falls through to the flat default exactly like a runtime spawn whose adapter cannot count. | `packages/core/dist/index.d.ts` |
| <a id="property-evidencecontract"></a> `evidenceContract?` | [`EvidenceContract`](/api/@rulvar/rulvar/interfaces/EvidenceContract.md) | The declared evidence contract this spawn must fill (RV303): wins over the registered profile's declaration. The estimator compares the call floor (`minEntries * estCallsPerEntry + overheadCalls`, defaults 3 and 8) against the spawn's effective executed-call ceiling and warns `tool-cap-below-evidence-floor` when the cap cannot fit the contract. | `packages/core/dist/index.d.ts` |
| <a id="property-label"></a> `label?` | `string` | Display label; defaults to the role name. | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | The call-layer limits, merged exactly like AgentOpts.limits. | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | Wins over the profile model over defaults.routing[role]. | `packages/core/dist/index.d.ts` |
| <a id="property-profile"></a> `profile?` | `string` | A registered AgentProfile name from defaults.profiles. | `packages/core/dist/index.d.ts` |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md) | Default 'loop', exactly like ctx.agent. | `packages/core/dist/index.d.ts` |
