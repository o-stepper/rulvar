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
  reason?: "exposure-drained" | "output-floor";
  retryable: boolean;
  retryAfterMs?: number;
  stage?: "loop" | "summarize" | "reserve-summary" | "finalize" | "extract";
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

### reason?

```ts
optional reason?: "exposure-drained" | "output-floor";
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

***

### retryAfterMs?

```ts
optional retryAfterMs?: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### stage?

```ts
optional stage?: "loop" | "summarize" | "reserve-summary" | "finalize" | "extract";
```

Defined in: `packages/core/dist/index.d.ts`

WHICH dispatch the budget killed (RV4703, the eighth comparison
experiment's first run): its child spent under the ceiling
through the whole loop and died on a synchronous budget refusal
of the FINALIZE dispatch (one millisecond, zero tokens), and no
surface named the stage; the cause was recovered from phase
forensics. Stamped by the loop's own budget gates on 'budget'
errors; carried to the wire in data and restored on read. Absent
means the error predates the stamp or is not a budget refusal.
