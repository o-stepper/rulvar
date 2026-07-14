[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OnEscalation

# Type Alias: OnEscalation

```ts
type OnEscalation = (result) => 
  | EscalationDecision
| Promise<EscalationDecision>;
```

Defined in: `packages/core/dist/index.d.ts`

Escalation hook: decides for value-form calls.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `result` | [`EscalatedResult`](/api/@rulvar/rulvar/type-aliases/EscalatedResult.md)\&lt;`unknown`\&gt; |

## Returns

  \| [`EscalationDecision`](/api/@rulvar/rulvar/type-aliases/EscalationDecision.md)
  \| `Promise`\&lt;[`EscalationDecision`](/api/@rulvar/rulvar/type-aliases/EscalationDecision.md)\&gt;
