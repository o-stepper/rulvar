[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / UsageLimits

# Interface: UsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:10](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L10)

UsageLimits (M1-T06): normative limit vocabulary and the per-spawn merge.

Full contract: https://docs.rulvar.com/guide/agents. Expiry of maxTurns, maxToolCalls,
or timeoutMs produces the terminal status 'limit' (paid partial work);
streamIdleTimeoutMs expiry is a retryable transport-class AgentError,
never 'limit'. The run-level deadline is RunOptions.deadlineAt, not a
UsageLimits field.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | Unlimited by default (model caps still apply). | [packages/core/src/runtime/usage-limits.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L16) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | Unlimited by default. | [packages/core/src/runtime/usage-limits.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L14) |
| <a id="property-maxturns"></a> `maxTurns?` | `number` | Default 32. | [packages/core/src/runtime/usage-limits.ts:12](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L12) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | The no-progress detector N (committed at 3): consecutive turns without tool calls or artifact deltas before the engine aborts with the dedicated class (M3-T08). | [packages/core/src/runtime/usage-limits.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L26) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs?` | `number` | Gap between stream events; default 120000. | [packages/core/src/runtime/usage-limits.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L20) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | Per-agent wall clock; unlimited by default. | [packages/core/src/runtime/usage-limits.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L18) |
