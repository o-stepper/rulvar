[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / CONSERVATIVE\_COMPATIBLE\_CAPS

# Variable: CONSERVATIVE\_COMPATIBLE\_CAPS

```ts
const CONSERVATIVE_COMPATIBLE_CAPS: ModelCaps;
```

Defined in: [packages/openai/src/compatible.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/compatible.ts#L37)

Gateways cannot be introspected reliably: when caps are not supplied
the factory assumes the most conservative capability set (docs/04,
section 6). Callers SHOULD supply caps for anything beyond it; the
window and output floors here are deliberately small so an unprobed
endpoint is never overcommitted. Absent pricing is legitimate for
local models: they surface as unpriced in CostReport.
