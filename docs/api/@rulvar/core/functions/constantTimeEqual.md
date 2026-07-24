[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / constantTimeEqual

# Function: constantTimeEqual()

```ts
function constantTimeEqual(a, b): boolean;
```

Defined in: [packages/core/src/l0/encryption.ts:439](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L439)

Guards against non-constant-time comparisons in host key checks.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `a` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) |
| `b` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) |

## Returns

`boolean`
