[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentError

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

Defined in: [packages/core/src/l0/errors.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L323)

The structured error value carried on AgentResult.error and journaled
inside the agent terminal entry. Deliberately NOT a RulvarError subclass.

## Properties

### issues?

```ts
optional issues?: Issue[];
```

Defined in: [packages/core/src/l0/errors.ts:327](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L327)

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

Defined in: [packages/core/src/l0/errors.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L324)

***

### retryable

```ts
retryable: boolean;
```

Defined in: [packages/core/src/l0/errors.ts:325](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L325)

***

### retryAfterMs?

```ts
optional retryAfterMs?: number;
```

Defined in: [packages/core/src/l0/errors.ts:326](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L326)
