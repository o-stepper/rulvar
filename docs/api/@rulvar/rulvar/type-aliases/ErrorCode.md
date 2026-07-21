[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ErrorCode

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
  | "fail_run"
  | "admission_rejected"
  | "sandbox_limit"
  | "lease_held"
  | "knowledge_cas";
```

Defined in: `packages/core/dist/index.d.ts`

The closed error-code registry.
'agent' is carried by the AgentError value projection, not by a
RulvarError subclass.
