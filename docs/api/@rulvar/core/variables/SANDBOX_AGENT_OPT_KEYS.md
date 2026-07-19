[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SANDBOX\_AGENT\_OPT\_KEYS

# Variable: SANDBOX\_AGENT\_OPT\_KEYS

```ts
const SANDBOX_AGENT_OPT_KEYS: readonly string[];
```

Defined in: [packages/core/src/runner/sandbox-bridge.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/sandbox-bridge.ts#L93)

The sanctioned JSON subset of AgentOpts a sandbox script may pass:
the planner-dialect allowlist. Exported as the single source both for
the runtime validator below and for the planner API card, so the two
can never drift (v1.22.0 review P2-4: the hand-maintained card had
silently fallen three options behind).
