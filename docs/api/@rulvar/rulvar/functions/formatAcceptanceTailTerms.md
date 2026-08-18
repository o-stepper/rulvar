[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / formatAcceptanceTailTerms

# Function: formatAcceptanceTailTerms()

```ts
function formatAcceptanceTailTerms(terms): string;
```

Defined in: `packages/core/dist/index.d.ts`

The one rendering of the tail arithmetic (RV4001): the runtime
refusal message and the preflight finding print this same string, so
an operator can diff them by eye and a test can assert them equal.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `terms` | [`AcceptanceTailTerms`](/api/@rulvar/rulvar/interfaces/AcceptanceTailTerms.md) |

## Returns

`string`
