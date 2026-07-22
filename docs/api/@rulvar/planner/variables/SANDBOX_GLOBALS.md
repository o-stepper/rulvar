[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / SANDBOX\_GLOBALS

# Variable: SANDBOX\_GLOBALS

```ts
const SANDBOX_GLOBALS: readonly string[];
```

Defined in: [packages/planner/src/compile.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/compile.ts#L31)

The exact curated sandbox global set, in canonical order.
The worker binds the ctx methods as bare globals under these names and
the API card teaches exactly this list.
