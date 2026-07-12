[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Effort

# Type Alias: Effort

```ts
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
```

Defined in: [packages/core/src/l0/messages.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L82)

Canonical effort: exactly five levels, a string-literal union, never a TS
enum (docs/04, section "Canonical effort"). OpenAI 'none' has no
canonical equivalent and is reachable only via providerOptions.
