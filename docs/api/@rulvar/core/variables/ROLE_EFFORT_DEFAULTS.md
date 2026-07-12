[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ROLE\_EFFORT\_DEFAULTS

# Variable: ROLE\_EFFORT\_DEFAULTS

```ts
const ROLE_EFFORT_DEFAULTS: Partial<Record<InvocationRole, Effort>>;
```

Defined in: [packages/core/src/model/router.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L65)

Role effort defaults (docs/04, section "Invocation roles and firing
protocol"): orchestrate and plan default to high; summarize and extract
default to low. loop and finalize have NO role default: when the chain
resolves nothing, the wire omits effort and identity records the spec
with the effort member absent (docs/04, section "Router and resolution
chain", as amended).
