[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ROLE\_EFFORT\_DEFAULTS

# Variable: ROLE\_EFFORT\_DEFAULTS

```ts
const ROLE_EFFORT_DEFAULTS: Partial<Record<InvocationRole, Effort>>;
```

Defined in: `packages/core/dist/index.d.ts`

Role effort defaults: orchestrate and plan default to high; summarize and extract
default to low. loop and finalize have NO role default: when the chain
resolves nothing, the wire omits effort and identity records the spec
with the effort member absent.
