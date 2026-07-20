[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / maskSecretsDeep

# Function: maskSecretsDeep()

```ts
function maskSecretsDeep<T>(value): T;
```

Defined in: [packages/core/src/l0/serialization.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L172)

Deep-masks every string value in a JSON tree; non-strings pass
through. Returns the input identity when nothing matched, so the
default-on policy costs no allocation on clean events.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `T` |

## Returns

`T`
