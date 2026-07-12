[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / createCtx

# Function: createCtx()

```ts
function createCtx(internals): Ctx<ErrorPolicy>;
```

Defined in: [packages/core/src/engine/ctx.ts:632](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L632)

Creates the per-run Ctx bound to `internals`. The current scope travels
through AsyncLocalStorage so parallel branches and pipeline stages keep
one ctx object while journaling under their own scope paths (I3:
structure from call-and-return only).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `internals` | [`RunInternals`](/api/@rulvar/core/interfaces/RunInternals.md) |

## Returns

[`Ctx`](/api/@rulvar/core/interfaces/Ctx.md)\&lt;[`ErrorPolicy`](/api/@rulvar/core/type-aliases/ErrorPolicy.md)\&gt;
