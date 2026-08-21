[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / normalizeExecutionScope

# Function: normalizeExecutionScope()

```ts
function normalizeExecutionScope(
   value, 
   site, 
   policy?): ExecutionScope;
```

Defined in: [packages/core/src/engine/engine.ts:993](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L993)

Validates and copies a declared scope (RV4007): own properties only
(the RV1205 doctrine: a prototype member must never resolve),
non-empty strings of at most 256 chars, at least one field, and the
copy is what gets recorded, so later host mutation of the passed
object cannot move the recorded identity. Under
`policy.unknown: 'reject'` (RV4205) an own enumerable field outside
the named dimensions refuses typed by name instead of dropping.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |
| `site` | `string` |
| `policy?` | [`ScopePolicy`](/api/@rulvar/core/interfaces/ScopePolicy.md) |

## Returns

[`ExecutionScope`](/api/@rulvar/core/interfaces/ExecutionScope.md)
