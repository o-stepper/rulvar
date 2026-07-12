[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanToolRuntime

# Interface: PlanToolRuntime

Defined in: [packages/plan/src/tools.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L297)

The engine seam the plan tools close over.

## Methods

### ledgerAppend()

```ts
ledgerAppend(op): Promise<{
  entryRef: number;
}>;
```

Defined in: [packages/plan/src/tools.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L300)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `op` | [`LedgerOp`](/api/@rulvar/plan/type-aliases/LedgerOp.md) |

#### Returns

`Promise`\<\{
  `entryRef`: `number`;
\}\>

***

### ledgerRead()

```ts
ledgerRead(): LedgerView;
```

Defined in: [packages/plan/src/tools.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L301)

#### Returns

[`LedgerView`](/api/@rulvar/plan/interfaces/LedgerView.md)

***

### planRevise()

```ts
planRevise(request): Promise<PlanReviseResult>;
```

Defined in: [packages/plan/src/tools.ts:299](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L299)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`PlanReviseRequest`](/api/@rulvar/plan/interfaces/PlanReviseRequest.md) |

#### Returns

`Promise`\&lt;[`PlanReviseResult`](/api/@rulvar/plan/interfaces/PlanReviseResult.md)\&gt;

***

### planView()

```ts
planView(): PlanViewRender;
```

Defined in: [packages/plan/src/tools.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L298)

#### Returns

[`PlanViewRender`](/api/@rulvar/plan/interfaces/PlanViewRender.md)
