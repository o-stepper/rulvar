[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ROLE\_EFFORT\_DEFAULTS

# Variable: ROLE\_EFFORT\_DEFAULTS

```ts
const ROLE_EFFORT_DEFAULTS: Partial<Record<InvocationRole, Effort>>;
```

Defined in: [packages/core/src/model/router.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L60)

Role effort defaults: orchestrate and plan default to high; summarize and extract
default to low. loop and finalize have NO role default: when the chain
resolves nothing, the wire omits effort and identity records the spec
with the effort member absent.
