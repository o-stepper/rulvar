[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CanonicalLadderSpec

# Interface: CanonicalLadderSpec

Defined in: `packages/core/dist/index.d.ts`

LadderSpec after canonicalization: every rung's effort resolved to an explicit value.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-acceptance"></a> `acceptance?` | [`Gate`](/api/@rulvar/rulvar/type-aliases/Gate.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-escalateon"></a> `escalateOn` | [`TriggerClass`](/api/@rulvar/rulvar/type-aliases/TriggerClass.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-rungs"></a> `rungs` | \{ `effort`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `maxCostUsd?`: `number`; `maxTokens`: `number`; `maxTurns`: `number`; `memoizeOutcome?`: `boolean`; `model`: `` `${string}:${string}` ``; \}[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-starttier"></a> `startTier` | `number` | After clamping of any orchestrator model_hint. | `packages/core/dist/index.d.ts` |
