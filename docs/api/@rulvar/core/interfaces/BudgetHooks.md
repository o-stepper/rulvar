[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetHooks

# Interface: BudgetHooks

Defined in: [packages/core/src/runtime/agent-loop.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L328)

Budget hooks bound by the three-layer budget.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitturnexposure"></a> `admitTurnExposure?` | (`servedBy`, `estimatedInputTokens`, `plannedOutputTokens`) => (() => `void`) \| `undefined` | - | [packages/core/src/runtime/agent-loop.ts:369](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L369) |
| <a id="property-assertpriceddispatch"></a> `assertPricedDispatch?` | (`servedBy`) => `void` | The strict pre-egress pricing gate (RV1508): wired only when RunOptions.strictPricing armed it; throws typed BEFORE the wire call for a model whose price row is missing, malformed, or stale. | [packages/core/src/runtime/agent-loop.ts:368](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L368) |
| <a id="property-maxaffordableoutputtokens"></a> `maxAffordableOutputTokens?` | (`servedBy`, `estimatedInputTokens`) => `number` \| `undefined` | Layer 2b, the pre-dispatch output bound: the output tokens the remaining budget still affords from `servedBy` for a prompt of `estimatedInputTokens`. The dispatch clamps the request's maxOutputTokens to it and denies the turn entirely when not even one output token fits. Undefined = unbounded (no ceiling, no price row, or free output). | [packages/core/src/runtime/agent-loop.ts:339](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L339) |
| <a id="property-opencallmeter"></a> `openCallMeter?` | (`servedBy`) => (`delta`) => `void` | Opens the per-call marginal meter (RV1101): one meter per provider call, fed every mid-stream delta and the settle remainder of THAT call. The budget prices the call's ACCUMULATED usage and debits the increment over what the call already paid, so a long-context tier crossed by the accumulation re-prices the whole call live exactly as the settled fold will; per-slice pricing can never see that crossing (no single slice crosses the threshold). Optional: hooks without it keep the historical per-slice debit into onUsage. | [packages/core/src/runtime/agent-loop.ts:386](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L386) |
| <a id="property-remainingusd"></a> `remainingUsd?` | () => `number` \| `undefined` | The remaining chain headroom in USD (RV301): the same arithmetic the output bound above reads, before pricing. Undefined = no ceiling anywhere on the chain. The tool budget extension admits a grant against it. | [packages/core/src/runtime/agent-loop.ts:349](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L349) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Layer 3: the ceiling AbortSignal. | [packages/core/src/runtime/agent-loop.ts:388](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L388) |

## Methods

### beforeTurn()

```ts
beforeTurn(): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:330](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L330)

Layer 2: before every turn; throws BudgetExhaustedError to block dispatch.

#### Returns

`void`

***

### onUsage()

```ts
onUsage(usage, servedBy): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:375](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L375)

Live usage accounting; layer 3 may respond by aborting `signal`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |
| `servedBy` | `` `${string}:${string}` `` |

#### Returns

`void`
