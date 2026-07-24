[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightSpawnSpec

# Interface: PreflightSpawnSpec

Defined in: [packages/core/src/engine/preflight.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L51)

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
| <a id="property-count"></a> `count?` | `number` | How many spawns of this shape the wave declares; default 1. | [packages/core/src/engine/preflight.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L72) |
| <a id="property-estcost"></a> `estCost?` | `number` | The call-layer admission reserve hint, exactly AgentOpts.estCost. | [packages/core/src/engine/preflight.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L63) |
| <a id="property-estinputtokens"></a> `estInputTokens?` | `number` | The prompt-size stand-in for the runtime's adapter countTokens: feeds the priced admission estimate and the per-turn and quota exposure floors. Absent, the reserve falls through to the flat default exactly like a runtime spawn whose adapter cannot count. | [packages/core/src/engine/preflight.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L70) |
| <a id="property-label"></a> `label?` | `string` | Display label; defaults to the role name. | [packages/core/src/engine/preflight.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L53) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | The call-layer limits, merged exactly like AgentOpts.limits. | [packages/core/src/engine/preflight.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L61) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | Wins over the profile model over defaults.routing[role]. | [packages/core/src/engine/preflight.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L59) |
| <a id="property-profile"></a> `profile?` | `string` | A registered AgentProfile name from defaults.profiles. | [packages/core/src/engine/preflight.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L57) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | Default 'loop', exactly like ctx.agent. | [packages/core/src/engine/preflight.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L55) |
