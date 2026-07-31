[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / assertSafeRunId

# Function: assertSafeRunId()

```ts
function assertSafeRunId(runId, context): void;
```

Defined in: [packages/core/src/l0/run-id.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/run-id.ts#L31)

Throws a ConfigError unless runId is a filesystem-safe token: a
non-empty string over [A-Za-z0-9._-] that is neither '.' nor '..'
(the dot pair passes the alphabet on its own, so it is refused
explicitly), no longer than [MAX\_RUN\_ID\_LENGTH](/api/@rulvar/core/variables/MAX_RUN_ID_LENGTH.md).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `context` | `string` |

## Returns

`void`
