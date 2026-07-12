[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CanonicalLadderSpec

# Interface: CanonicalLadderSpec

Defined in: [packages/core/src/l0/messages.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L246)

LadderSpec after canonicalization: every rung's effort resolved to an explicit value.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-acceptance"></a> `acceptance?` | [`Gate`](/api/@rulvar/core/type-aliases/Gate.md)[] | - | [packages/core/src/l0/messages.ts:258](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L258) |
| <a id="property-escalateon"></a> `escalateOn` | [`TriggerClass`](/api/@rulvar/core/type-aliases/TriggerClass.md)[] | - | [packages/core/src/l0/messages.ts:257](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L257) |
| <a id="property-rungs"></a> `rungs` | \{ `effort`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `maxCostUsd?`: `number`; `maxTokens`: `number`; `maxTurns`: `number`; `memoizeOutcome?`: `boolean`; `model`: `` `${string}:${string}` ``; \}[] | - | [packages/core/src/l0/messages.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L247) |
| <a id="property-starttier"></a> `startTier` | `number` | After clamping of any orchestrator model_hint. | [packages/core/src/l0/messages.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L256) |
