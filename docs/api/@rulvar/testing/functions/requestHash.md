[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / requestHash

# Function: requestHash()

```ts
function requestHash(req): string;
```

Defined in: [packages/testing/src/vcr.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L147)

The cassette key: a hash of the canonical wire-contract request. The
engine-populated telemetry namespace is excluded (never identity);
so is `cacheHint` (RV2006), whose own contract says it MUST NOT
enter identity and MUST NOT change response semantics: a cassette
recorded before the cache policy shipped replays a hinted request
byte for byte, and toggling the policy can never re-key a row.
Everything else the adapter would send keys the row.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |

## Returns

`string`
