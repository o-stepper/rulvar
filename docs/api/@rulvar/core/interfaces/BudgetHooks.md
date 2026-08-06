[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetHooks

# Interface: BudgetHooks

Defined in: [packages/core/src/runtime/agent-loop.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L336)

Budget hooks bound by the three-layer budget.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitturnexposure"></a> `admitTurnExposure?` | (`servedBy`, `estimatedInputTokens`, `plannedOutputTokens`) => (() => `void`) \| `undefined` | - | [packages/core/src/runtime/agent-loop.ts:377](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L377) |
| <a id="property-assertpriceddispatch"></a> `assertPricedDispatch?` | (`servedBy`) => `void` | The strict pre-egress pricing gate (RV1508): wired only when RunOptions.strictPricing armed it; throws typed BEFORE the wire call for a model whose price row is missing, malformed, or stale. | [packages/core/src/runtime/agent-loop.ts:376](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L376) |
| <a id="property-awaitexposurerelease"></a> `awaitExposureRelease?` | (`signal?`) => `Promise`\&lt;`"aborted"` \| `"released"` \| `"drained"`\&gt; | Parks until the next in-flight exposure hold releases (RV1902): 'released' on that wake, 'drained' immediately when no hold is live, 'aborted' when the signal fires first. Wired beside admitTurnExposure when the cap is configured; consumed only by invocations that opted into the exposure wait. | [packages/core/src/runtime/agent-loop.ts:389](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L389) |
| <a id="property-liveexposureusd"></a> `liveExposureUsd?` | () => `number` | Live in-flight exposure currently held by open dispatches (RV1902). | [packages/core/src/runtime/agent-loop.ts:391](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L391) |
| <a id="property-maxaffordableoutputtokens"></a> `maxAffordableOutputTokens?` | (`servedBy`, `estimatedInputTokens`) => `number` \| `undefined` | Layer 2b, the pre-dispatch output bound: the output tokens the remaining budget still affords from `servedBy` for a prompt of `estimatedInputTokens`. The dispatch clamps the request's maxOutputTokens to it and denies the turn entirely when not even one output token fits. Undefined = unbounded (no ceiling, no price row, or free output). | [packages/core/src/runtime/agent-loop.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L347) |
| <a id="property-opencallmeter"></a> `openCallMeter?` | (`servedBy`) => (`delta`) => `void` | Opens the per-call marginal meter (RV1101): one meter per provider call, fed every mid-stream delta and the settle remainder of THAT call. The budget prices the call's ACCUMULATED usage and debits the increment over what the call already paid, so a long-context tier crossed by the accumulation re-prices the whole call live exactly as the settled fold will; per-slice pricing can never see that crossing (no single slice crosses the threshold). Optional: hooks without it keep the historical per-slice debit into onUsage. | [packages/core/src/runtime/agent-loop.ts:404](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L404) |
| <a id="property-remainingusd"></a> `remainingUsd?` | () => `number` \| `undefined` | The remaining chain headroom in USD (RV301): the same arithmetic the output bound above reads, before pricing. Undefined = no ceiling anywhere on the chain. The tool budget extension admits a grant against it. | [packages/core/src/runtime/agent-loop.ts:357](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L357) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Layer 3: the ceiling AbortSignal. | [packages/core/src/runtime/agent-loop.ts:406](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L406) |

## Methods

### beforeTurn()

```ts
beforeTurn(): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:338](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L338)

Layer 2: before every turn; throws BudgetExhaustedError to block dispatch.

#### Returns

`void`

***

### onUsage()

```ts
onUsage(usage, servedBy): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:393](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L393)

Live usage accounting; layer 3 may respond by aborting `signal`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |
| `servedBy` | `` `${string}:${string}` `` |

#### Returns

`void`
