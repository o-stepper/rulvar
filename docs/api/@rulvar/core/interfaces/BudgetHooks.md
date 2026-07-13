[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetHooks

# Interface: BudgetHooks

Defined in: [packages/core/src/runtime/agent-loop.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L156)

Budget hooks bound by the three-layer budget.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Layer 3: the ceiling AbortSignal. | [packages/core/src/runtime/agent-loop.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L162) |

## Methods

### beforeTurn()

```ts
beforeTurn(): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L158)

Layer 2: before every turn; throws BudgetExhaustedError to block dispatch.

#### Returns

`void`

***

### onUsage()

```ts
onUsage(usage, servedBy): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L160)

Live usage accounting; layer 3 may respond by aborting `signal`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |
| `servedBy` | `` `${string}:${string}` `` |

#### Returns

`void`
