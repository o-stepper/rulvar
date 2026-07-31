[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / assertSafeRunId

# Function: assertSafeRunId()

```ts
function assertSafeRunId(runId, context): void;
```

Defined in: `packages/core/dist/index.d.ts`

Throws a ConfigError unless runId is a filesystem-safe token: a
non-empty string over [A-Za-z0-9._-] that is neither '.' nor '..'
(the dot pair passes the alphabet on its own, so it is refused
explicitly), no longer than [MAX\_RUN\_ID\_LENGTH](/api/@rulvar/rulvar/variables/MAX_RUN_ID_LENGTH.md).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `context` | `string` |

## Returns

`void`
