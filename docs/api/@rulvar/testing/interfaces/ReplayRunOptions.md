[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / ReplayRunOptions

# Interface: ReplayRunOptions

Defined in: [packages/testing/src/replay-strict.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/replay-strict.ts#L25)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapters"></a> `adapters?` | [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[] | Identity depends on the resolved model spec, so replays must resolve through the SAME routing as the recording run. Defaults to the createTestEngine fake routing; override for journals recorded against other adapters. | [packages/testing/src/replay-strict.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/replay-strict.ts#L36) |
| <a id="property-journal"></a> `journal` | \| [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] \| \{ `runId`: `string`; `store`: [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md); \} | The journal to replay: raw entries, or a store plus runId. | [packages/testing/src/replay-strict.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/replay-strict.ts#L27) |
| <a id="property-mode"></a> `mode?` | `"strict"` | 'strict' (default): any live call throws JournalMissError. | [packages/testing/src/replay-strict.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/replay-strict.ts#L29) |
| <a id="property-onescalation"></a> `onEscalation?` | (`result`) => \| [`EscalationDecision`](/api/@rulvar/rulvar/type-aliases/EscalationDecision.md) \| `Promise`\&lt;[`EscalationDecision`](/api/@rulvar/rulvar/type-aliases/EscalationDecision.md)\&gt; | Escalation hook for value-form workflows (should stay cold on replay). | [packages/testing/src/replay-strict.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/replay-strict.ts#L40) |
| <a id="property-profiles"></a> `profiles?` | `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)\&gt; | - | [packages/testing/src/replay-strict.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/replay-strict.ts#L38) |
| <a id="property-routing"></a> `routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt; | - | [packages/testing/src/replay-strict.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/replay-strict.ts#L37) |
