[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetHooks

# Interface: BudgetHooks

Defined in: [packages/core/src/runtime/agent-loop.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L147)

Budget hooks bound by the three-layer budget.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Layer 3: the ceiling AbortSignal. | [packages/core/src/runtime/agent-loop.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L153) |

## Methods

### beforeTurn()

```ts
beforeTurn(): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L149)

Layer 2: before every turn; throws BudgetExhaustedError to block dispatch.

#### Returns

`void`

***

### onUsage()

```ts
onUsage(usage, servedBy): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L151)

Live usage accounting; layer 3 may respond by aborting `signal`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |
| `servedBy` | `` `${string}:${string}` `` |

#### Returns

`void`
