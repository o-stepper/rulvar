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
  reason?: "exposure-drained" | "output-floor";
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
optional reason?: "exposure-drained" | "output-floor";
```

Defined in: [packages/core/src/l0/errors.ts:481](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L481)

The typed refusal marker (RV2002, widened by RV2101):
'exposure-drained' names a spawned child refused pre-wire by the
in-flight exposure cap with no live holder left to wait out (zero
provider attempts by construction, so the seat is cheap to
re-spawn; an orchestrator treats it as a starved seat, never a
crashed child). 'output-floor' names a turn refused pre-wire
because the remaining budget past the held reserves cannot afford
the model's output floor: at the reserve line this is the
boundary where the coordination loop settles partial and the
synthesis promise is redeemed, never a crash.

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
