[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OnEscalation

# Type Alias: OnEscalation

```ts
type OnEscalation = (result) => 
  | EscalationDecision
| Promise<EscalationDecision>;
```

Defined in: [packages/core/src/runner/inprocess.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L33)

Escalation hook: decides for value-form calls.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `result` | [`EscalatedResult`](/api/@rulvar/core/type-aliases/EscalatedResult.md)\&lt;`unknown`\&gt; |

## Returns

  \| [`EscalationDecision`](/api/@rulvar/core/type-aliases/EscalationDecision.md)
  \| `Promise`\&lt;[`EscalationDecision`](/api/@rulvar/core/type-aliases/EscalationDecision.md)\&gt;
