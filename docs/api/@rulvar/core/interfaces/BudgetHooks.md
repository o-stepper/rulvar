[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetHooks

# Interface: BudgetHooks

Defined in: [packages/core/src/runtime/agent-loop.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L185)

Budget hooks bound by the three-layer budget.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-maxaffordableoutputtokens"></a> `maxAffordableOutputTokens?` | (`servedBy`, `estimatedInputTokens`) => `number` \| `undefined` | Layer 2b, the pre-dispatch output bound: the output tokens the remaining budget still affords from `servedBy` for a prompt of `estimatedInputTokens`. The dispatch clamps the request's maxOutputTokens to it and denies the turn entirely when not even one output token fits. Undefined = unbounded (no ceiling, no price row, or free output). | [packages/core/src/runtime/agent-loop.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L196) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Layer 3: the ceiling AbortSignal. | [packages/core/src/runtime/agent-loop.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L203) |

## Methods

### beforeTurn()

```ts
beforeTurn(): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L187)

Layer 2: before every turn; throws BudgetExhaustedError to block dispatch.

#### Returns

`void`

***

### onUsage()

```ts
onUsage(usage, servedBy): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L201)

Live usage accounting; layer 3 may respond by aborting `signal`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |
| `servedBy` | `` `${string}:${string}` `` |

#### Returns

`void`
