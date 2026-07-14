[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / LadderSpec

# Interface: LadderSpec

Defined in: `packages/core/dist/index.d.ts`

The author-facing ladder declaration. This is the SINGLE declaration of
the ladder family: other layers reference it and never redeclare (runtime
semantics land in M7).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-acceptance"></a> `acceptance?` | [`Gate`](/api/@rulvar/rulvar/type-aliases/Gate.md)[] | `packages/core/dist/index.d.ts` |
| <a id="property-escalateon"></a> `escalateOn` | [`TriggerClass`](/api/@rulvar/rulvar/type-aliases/TriggerClass.md)[] | `packages/core/dist/index.d.ts` |
| <a id="property-rungs"></a> `rungs` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `maxCostUsd?`: `number`; `maxTokens`: `number`; `maxTurns`: `number`; `memoizeOutcome?`: `boolean`; `model`: `` `${string}:${string}` ``; \}[] | `packages/core/dist/index.d.ts` |
| <a id="property-starttier"></a> `startTier` | `number` | `packages/core/dist/index.d.ts` |
