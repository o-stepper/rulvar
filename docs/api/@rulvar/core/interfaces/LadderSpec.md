[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / LadderSpec

# Interface: LadderSpec

Defined in: [packages/core/src/l0/messages.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L234)

The author-facing ladder declaration. This is the SINGLE declaration of
the ladder family: other layers reference it and never redeclare (runtime
semantics land in M7).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-acceptance"></a> `acceptance?` | [`Gate`](/api/@rulvar/core/type-aliases/Gate.md)[] | [packages/core/src/l0/messages.ts:249](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L249) |
| <a id="property-escalateon"></a> `escalateOn` | [`TriggerClass`](/api/@rulvar/core/type-aliases/TriggerClass.md)[] | [packages/core/src/l0/messages.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L248) |
| <a id="property-rungs"></a> `rungs` | \{ `effort?`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `maxCostUsd?`: `number`; `maxTokens`: `number`; `maxTurns`: `number`; `memoizeOutcome?`: `boolean`; `model`: `` `${string}:${string}` ``; \}[] | [packages/core/src/l0/messages.ts:235](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L235) |
| <a id="property-starttier"></a> `startTier` | `number` | [packages/core/src/l0/messages.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L247) |
