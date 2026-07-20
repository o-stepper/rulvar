[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / requestHash

# Function: requestHash()

```ts
function requestHash(req): string;
```

Defined in: [packages/testing/src/vcr.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L141)

The cassette key: a hash of the canonical wire-contract request. The
engine-populated telemetry namespace is excluded (never identity);
everything else the adapter would send keys the
row.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |

## Returns

`string`
