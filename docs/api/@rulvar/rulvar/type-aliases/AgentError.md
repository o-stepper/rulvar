[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AgentError

# Type Alias: AgentError

```ts
type AgentError = {
  issues?: Issue[];
  kind:   | "transport"
     | "rate-limit"
     | "schema-mismatch"
     | "tool"
     | "budget"
     | "terminal";
  retryable: boolean;
  retryAfterMs?: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

The structured error value carried on AgentResult.error and journaled
inside the agent terminal entry. Deliberately NOT a RulvarError subclass.

## Properties

### issues?

```ts
optional issues?: Issue[];
```

Defined in: `packages/core/dist/index.d.ts`

***

### kind

```ts
kind: 
  | "transport"
  | "rate-limit"
  | "schema-mismatch"
  | "tool"
  | "budget"
  | "terminal";
```

Defined in: `packages/core/dist/index.d.ts`

***

### retryable

```ts
retryable: boolean;
```

Defined in: `packages/core/dist/index.d.ts`

***

### retryAfterMs?

```ts
optional retryAfterMs?: number;
```

Defined in: `packages/core/dist/index.d.ts`
