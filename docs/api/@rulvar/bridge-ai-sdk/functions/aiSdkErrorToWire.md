[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/bridge-ai-sdk](/api/@rulvar/bridge-ai-sdk/index.md) / aiSdkErrorToWire

# Function: aiSdkErrorToWire()

```ts
function aiSdkErrorToWire(error): WireError;
```

Defined in: [packages/bridge-ai-sdk/src/bridge.ts:819](https://github.com/o-stepper/rulvar/blob/main/packages/bridge-ai-sdk/src/bridge.ts#L819)

Projects a thrown value from the wrapped model into a typed WireError.
APICallError carries the provider's status and headers: 429 surfaces as
a retryable rate-limit with retryAfterMs; 5xx and status-less network
failures are retryable transport; other statuses are terminal transport.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | `unknown` |

## Returns

[`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md)
