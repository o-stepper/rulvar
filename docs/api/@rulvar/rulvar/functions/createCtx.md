[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / createCtx

# Function: createCtx()

```ts
function createCtx(internals): Ctx<ErrorPolicy>;
```

Defined in: `packages/core/dist/index.d.ts`

Creates the per-run Ctx bound to `internals`. The current scope travels
through AsyncLocalStorage so parallel branches and pipeline stages keep
one ctx object while journaling under their own scope paths (I3:
structure from call-and-return only).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `internals` | [`RunInternals`](/api/@rulvar/rulvar/interfaces/RunInternals.md) |

## Returns

[`Ctx`](/api/@rulvar/rulvar/interfaces/Ctx.md)\&lt;[`ErrorPolicy`](/api/@rulvar/rulvar/type-aliases/ErrorPolicy.md)\&gt;
