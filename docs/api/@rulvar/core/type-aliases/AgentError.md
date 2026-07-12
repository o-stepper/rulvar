[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentError

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

Defined in: [packages/core/src/l0/errors.ts:330](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L330)

The structured error value carried on AgentResult.error and journaled
inside the agent terminal entry. Deliberately NOT a RulvarError subclass
(docs/02, section "Error taxonomy").

## Properties

### issues?

```ts
optional issues?: Issue[];
```

Defined in: [packages/core/src/l0/errors.ts:334](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L334)

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

Defined in: [packages/core/src/l0/errors.ts:331](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L331)

***

### retryable

```ts
retryable: boolean;
```

Defined in: [packages/core/src/l0/errors.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L332)

***

### retryAfterMs?

```ts
optional retryAfterMs?: number;
```

Defined in: [packages/core/src/l0/errors.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L333)
