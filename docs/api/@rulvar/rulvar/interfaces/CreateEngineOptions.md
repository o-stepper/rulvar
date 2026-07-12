[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CreateEngineOptions

# Interface: CreateEngineOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapters"></a> `adapters` | [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-budgetdefaults"></a> `budgetDefaults?` | [`BudgetDefaults`](/api/@rulvar/rulvar/interfaces/BudgetDefaults.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-concurrency"></a> `concurrency?` | \{ `perProvider?`: `Record`\&lt;`string`, `number`\&gt;; `perRun?`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `concurrency.perProvider?` | `Record`\&lt;`string`, `number`\&gt; | - | `packages/core/dist/index.d.ts` |
| `concurrency.perRun?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-defaults"></a> `defaults?` | [`EngineDefaults`](/api/@rulvar/rulvar/interfaces/EngineDefaults.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-extraderivers"></a> `extraDerivers?` | readonly `unknown`[] | KeyDeriver registry extension (see https://docs.rulvar.com/guide/journal-compatibility). Plumbed now, consumed by the matching kernel from M2. | `packages/core/dist/index.d.ts` |
| <a id="property-onescalation"></a> `onEscalation?` | (`result`) => \| [`EscalationDecision`](/api/@rulvar/rulvar/type-aliases/EscalationDecision.md) \| `Promise`\&lt;[`EscalationDecision`](/api/@rulvar/rulvar/type-aliases/EscalationDecision.md)\&gt; | The InProcessRunner escalation hook: receives escalated results when the call form cannot carry them; the returned decision is journaled as the authoritative escalation-decision entry. | `packages/core/dist/index.d.ts` |
| <a id="property-pricing"></a> `pricing?` | [`PriceTable`](/api/@rulvar/rulvar/interfaces/PriceTable.md) | Versioned price table; wins over caps.pricing (M4-T06). | `packages/core/dist/index.d.ts` |
| <a id="property-redaction"></a> `redaction?` | \{ `maskEvents?`: `boolean`; \} | The default key-masking policy at the telemetry boundary. Default ON: key-shaped strings in every emitted WorkflowEvent are masked; never touches the journal. | `packages/core/dist/index.d.ts` |
| `redaction.maskEvents?` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-runners"></a> `runners?` | \{ `sandbox?`: [`ScriptRunner`](/api/@rulvar/rulvar/interfaces/ScriptRunner.md); \} | Runner registrations beyond the built-in InProcessRunner (M6-T02). `sandbox` executes CompiledWorkflow values (WorkerSandboxRunner ships in @rulvar/planner); running or resuming a compiled workflow without one is a typed ConfigError. | `packages/core/dist/index.d.ts` |
| `runners.sandbox?` | [`ScriptRunner`](/api/@rulvar/rulvar/interfaces/ScriptRunner.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-serialization"></a> `serialization?` | [`SerializationHook`](/api/@rulvar/rulvar/interfaces/SerializationHook.md) | Redact/encrypt at the append/put boundaries, symmetric on load/get (M8-T04, OQ-22 executed). Applied by wrapping the configured stores; Engine.stores exposes the wrapped instances, so every reader passes one policy point. | `packages/core/dist/index.d.ts` |
| <a id="property-stores"></a> `stores?` | \{ `journal?`: [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md); `modelKnowledge?`: [`ModelKnowledgeStore`](/api/@rulvar/rulvar/interfaces/ModelKnowledgeStore.md); `transcripts?`: [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md); \} | - | `packages/core/dist/index.d.ts` |
| `stores.journal?` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) | Default InMemoryStore (resume disabled, loud warning). | `packages/core/dist/index.d.ts` |
| `stores.modelKnowledge?` | [`ModelKnowledgeStore`](/api/@rulvar/rulvar/interfaces/ModelKnowledgeStore.md) | The ModelKnowledge claim store (M10-T03). Optional and OFF by default: an engine without it writes no kb entries at all. The runtime only ever receives the current()-only handle. | `packages/core/dist/index.d.ts` |
| `stores.transcripts?` | [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md) | - | `packages/core/dist/index.d.ts` |
