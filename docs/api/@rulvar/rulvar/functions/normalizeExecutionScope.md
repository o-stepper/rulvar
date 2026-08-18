[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / normalizeExecutionScope

# Function: normalizeExecutionScope()

```ts
function normalizeExecutionScope(value, site): ExecutionScope;
```

Defined in: `packages/core/dist/index.d.ts`

Validates and copies a declared scope (RV4007): own properties only
(the RV1205 doctrine: a prototype member must never resolve),
non-empty strings of at most 256 chars, at least one field, and the
copy is what gets recorded, so later host mutation of the passed
object cannot move the recorded identity.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |
| `site` | `string` |

## Returns

[`ExecutionScope`](/api/@rulvar/rulvar/interfaces/ExecutionScope.md)
