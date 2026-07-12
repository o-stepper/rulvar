[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ErrorCode

# Type Alias: ErrorCode

```ts
type ErrorCode = 
  | "agent"
  | "config"
  | "non_serializable_value"
  | "script_rejected"
  | "journal_compat"
  | "invalid_resolution"
  | "journal_order_violation"
  | "plan_invariant"
  | "replay_plan_hash_mismatch"
  | "orchestrator_cap_config"
  | "journal_miss"
  | "budget_exhausted"
  | "admission_rejected"
  | "sandbox_limit"
  | "lease_held"
  | "knowledge_cas";
```

Defined in: [packages/core/src/l0/errors.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L28)

The closed error-code registry.
'agent' is carried by the AgentError value projection, not by a
RulvarError subclass.
