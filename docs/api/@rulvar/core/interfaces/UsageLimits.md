[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / UsageLimits

# Interface: UsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:11](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L11)

UsageLimits (M1-T06): normative limit vocabulary and the per-spawn merge.

Owning spec: docs/06-execution-spec.md, section "UsageLimits
(normative)"; defaults from Appendix A. Expiry of maxTurns, maxToolCalls,
or timeoutMs produces the terminal status 'limit' (paid partial work);
streamIdleTimeoutMs expiry is a retryable transport-class AgentError,
never 'limit'. The run-level deadline is RunOptions.deadlineAt, not a
UsageLimits field.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | Unlimited by default (model caps still apply). | [packages/core/src/runtime/usage-limits.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L17) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | Unlimited by default. | [packages/core/src/runtime/usage-limits.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L15) |
| <a id="property-maxturns"></a> `maxTurns?` | `number` | Default 32. | [packages/core/src/runtime/usage-limits.ts:13](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L13) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | The no-progress detector N (docs/06 Appendix A, committed at 3): consecutive turns without tool calls or artifact deltas before the engine aborts with the dedicated class (M3-T08). | [packages/core/src/runtime/usage-limits.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L27) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs?` | `number` | Gap between stream events; default 120000. | [packages/core/src/runtime/usage-limits.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L21) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | Per-agent wall clock; unlimited by default. | [packages/core/src/runtime/usage-limits.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L19) |
