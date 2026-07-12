[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanToolRuntime

# Interface: PlanToolRuntime

Defined in: [packages/plan/src/tools.ts:338](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L338)

The engine seam the plan tools close over.

## Methods

### kbPropose()?

```ts
optional kbPropose(input): Promise<{
  entryRef: number;
}>;
```

Defined in: [packages/plan/src/tools.ts:348](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L348)

Phase 3 opt-in: resolves the tier-relative payload into a concrete
KbProposal and journals it as the observation_add ledger.op. Absent
unless the run opted into kb_propose.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`KbProposeInput`](/api/@rulvar/plan/interfaces/KbProposeInput.md) |

#### Returns

`Promise`\<\{
  `entryRef`: `number`;
\}\>

***

### ledgerAppend()

```ts
ledgerAppend(op): Promise<{
  entryRef: number;
}>;
```

Defined in: [packages/plan/src/tools.ts:341](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L341)

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

Defined in: [packages/plan/src/tools.ts:342](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L342)

#### Returns

[`LedgerView`](/api/@rulvar/plan/interfaces/LedgerView.md)

***

### planRevise()

```ts
planRevise(request): Promise<PlanReviseResult>;
```

Defined in: [packages/plan/src/tools.ts:340](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L340)

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

Defined in: [packages/plan/src/tools.ts:339](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L339)

#### Returns

[`PlanViewRender`](/api/@rulvar/plan/interfaces/PlanViewRender.md)
