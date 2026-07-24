[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / constantTimeEqual

# Function: constantTimeEqual()

```ts
function constantTimeEqual(a, b): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

Guards against non-constant-time comparisons in host key checks.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `a` | [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md) |
| `b` | [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md) |

## Returns

`boolean`
