[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetHooks

# Interface: BudgetHooks

Defined in: [packages/core/src/runtime/agent-loop.ts:308](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L308)

Budget hooks bound by the three-layer budget.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitturnexposure"></a> `admitTurnExposure?` | (`servedBy`, `estimatedInputTokens`, `plannedOutputTokens`) => (() => `void`) \| `undefined` | The in-flight exposure admission (RV711), wired only when the cap is configured. Called synchronously right before each provider dispatch attempt with the attempt's own request estimate: the serving model, the estimated prompt tokens, and the planned worst-case output tokens (the request's effective maxOutputTokens, else the model's declared output cap). Throws BudgetExhaustedError (data.reason 'in-flight-exposure') to refuse the dispatch typed, on the same surface as the layer-2b output bound; returns the release closure the loop calls once the attempt settles, so the reservation lives exactly as long as the wire call it covers. Undefined result = nothing reserved (the cap resolved inert). | [packages/core/src/runtime/agent-loop.ts:343](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L343) |
| <a id="property-maxaffordableoutputtokens"></a> `maxAffordableOutputTokens?` | (`servedBy`, `estimatedInputTokens`) => `number` \| `undefined` | Layer 2b, the pre-dispatch output bound: the output tokens the remaining budget still affords from `servedBy` for a prompt of `estimatedInputTokens`. The dispatch clamps the request's maxOutputTokens to it and denies the turn entirely when not even one output token fits. Undefined = unbounded (no ceiling, no price row, or free output). | [packages/core/src/runtime/agent-loop.ts:319](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L319) |
| <a id="property-remainingusd"></a> `remainingUsd?` | () => `number` \| `undefined` | The remaining chain headroom in USD (RV301): the same arithmetic the output bound above reads, before pricing. Undefined = no ceiling anywhere on the chain. The tool budget extension admits a grant against it. | [packages/core/src/runtime/agent-loop.ts:329](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L329) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Layer 3: the ceiling AbortSignal. | [packages/core/src/runtime/agent-loop.ts:351](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L351) |

## Methods

### beforeTurn()

```ts
beforeTurn(): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:310](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L310)

Layer 2: before every turn; throws BudgetExhaustedError to block dispatch.

#### Returns

`void`

***

### onUsage()

```ts
onUsage(usage, servedBy): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:349](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L349)

Live usage accounting; layer 3 may respond by aborting `signal`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |
| `servedBy` | `` `${string}:${string}` `` |

#### Returns

`void`
