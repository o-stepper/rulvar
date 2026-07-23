[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CanonicalLadderSpec

# Interface: CanonicalLadderSpec

Defined in: [packages/core/src/l0/messages.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L253)

LadderSpec after canonicalization: every rung's effort resolved to an explicit value.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-acceptance"></a> `acceptance?` | [`Gate`](/api/@rulvar/core/type-aliases/Gate.md)[] | - | [packages/core/src/l0/messages.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L265) |
| <a id="property-escalateon"></a> `escalateOn` | [`TriggerClass`](/api/@rulvar/core/type-aliases/TriggerClass.md)[] | - | [packages/core/src/l0/messages.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L264) |
| <a id="property-rungs"></a> `rungs` | \{ `effort`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `maxCostUsd?`: `number`; `maxTokens`: `number`; `maxTurns`: `number`; `memoizeOutcome?`: `boolean`; `model`: `` `${string}:${string}` ``; \}[] | - | [packages/core/src/l0/messages.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L254) |
| <a id="property-starttier"></a> `startTier` | `number` | After clamping of any orchestrator model_hint. | [packages/core/src/l0/messages.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L263) |
