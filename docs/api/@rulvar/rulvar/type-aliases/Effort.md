[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Effort

# Type Alias: Effort

```ts
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Canonical effort: exactly five levels, a string-literal union, never a TS
enum (docs/04, section "Canonical effort"). OpenAI 'none' has no
canonical equivalent and is reachable only via providerOptions.
