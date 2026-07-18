[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / openAiErrorToWire

# Function: openAiErrorToWire()

```ts
function openAiErrorToWire(error): WireError;
```

Defined in: [packages/openai/src/wire.ts:493](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L493)

Projects SDK/API errors into the retryable WireError vocabulary.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | `unknown` |

## Returns

[`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md)
