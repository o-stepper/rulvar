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

Defined in: [packages/core/src/l0/errors.ts:342](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L342)

The structured error value carried on AgentResult.error and journaled
inside the agent terminal entry. Deliberately NOT a RulvarError subclass.

## Properties

### issues?

```ts
optional issues?: Issue[];
```

Defined in: [packages/core/src/l0/errors.ts:346](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L346)

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

Defined in: [packages/core/src/l0/errors.ts:343](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L343)

***

### retryable

```ts
retryable: boolean;
```

Defined in: [packages/core/src/l0/errors.ts:344](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L344)

***

### retryAfterMs?

```ts
optional retryAfterMs?: number;
```

Defined in: [packages/core/src/l0/errors.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L345)
