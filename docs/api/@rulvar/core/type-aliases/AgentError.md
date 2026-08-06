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
  reason?: "exposure-drained";
  retryable: boolean;
  retryAfterMs?: number;
};
```

Defined in: [packages/core/src/l0/errors.ts:464](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L464)

The structured error value carried on AgentResult.error and journaled
inside the agent terminal entry. Deliberately NOT a RulvarError subclass.

## Properties

### issues?

```ts
optional issues?: Issue[];
```

Defined in: [packages/core/src/l0/errors.ts:468](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L468)

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

Defined in: [packages/core/src/l0/errors.ts:465](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L465)

***

### reason?

```ts
optional reason?: "exposure-drained";
```

Defined in: [packages/core/src/l0/errors.ts:476](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L476)

The typed refusal marker (RV2002): 'exposure-drained' names a
spawned child refused pre-wire by the in-flight exposure cap with
no live holder left to wait out. Zero provider attempts by
construction, so the seat is cheap to re-spawn; an orchestrator
treats it as a starved seat, never a crashed child.

***

### retryable

```ts
retryable: boolean;
```

Defined in: [packages/core/src/l0/errors.ts:466](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L466)

***

### retryAfterMs?

```ts
optional retryAfterMs?: number;
```

Defined in: [packages/core/src/l0/errors.ts:467](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L467)
