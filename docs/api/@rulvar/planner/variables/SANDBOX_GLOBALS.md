[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / SANDBOX\_GLOBALS

# Variable: SANDBOX\_GLOBALS

```ts
const SANDBOX_GLOBALS: readonly string[];
```

Defined in: [packages/planner/src/compile.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/compile.ts#L25)

The exact curated sandbox global set, in docs order (docs/06, 8.2).
The worker binds the ctx methods as bare globals under these names and
the API card teaches exactly this list.
