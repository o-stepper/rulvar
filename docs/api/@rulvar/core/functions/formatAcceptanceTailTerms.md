[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / formatAcceptanceTailTerms

# Function: formatAcceptanceTailTerms()

```ts
function formatAcceptanceTailTerms(terms): string;
```

Defined in: [packages/core/src/orchestrator/admission.ts:434](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L434)

The one rendering of the tail arithmetic (RV4001): the runtime
refusal message and the preflight finding print this same string, so
an operator can diff them by eye and a test can assert them equal.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `terms` | [`AcceptanceTailTerms`](/api/@rulvar/core/interfaces/AcceptanceTailTerms.md) |

## Returns

`string`
