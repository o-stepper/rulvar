[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CreateEngineOptions

# Interface: CreateEngineOptions

Defined in: [packages/core/src/engine/engine.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L130)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapters"></a> `adapters` | [`ProviderAdapter`](/api/@rulvar/core/interfaces/ProviderAdapter.md)[] | - | [packages/core/src/engine/engine.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L131) |
| <a id="property-budgetdefaults"></a> `budgetDefaults?` | [`BudgetDefaults`](/api/@rulvar/core/interfaces/BudgetDefaults.md) | - | [packages/core/src/engine/engine.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L144) |
| <a id="property-concurrency"></a> `concurrency?` | \{ `perProvider?`: `Record`\&lt;`string`, `number`\&gt;; `perRun?`: `number`; \} | - | [packages/core/src/engine/engine.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L145) |
| `concurrency.perProvider?` | `Record`\&lt;`string`, `number`\&gt; | Per-adapter-id caps; unlimited unless configured (Appendix A; M4-T07). | [packages/core/src/engine/engine.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L148) |
| `concurrency.perRun?` | `number` | - | [packages/core/src/engine/engine.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L146) |
| <a id="property-defaults"></a> `defaults?` | [`EngineDefaults`](/api/@rulvar/core/interfaces/EngineDefaults.md) | - | [packages/core/src/engine/engine.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L143) |
| <a id="property-extraderivers"></a> `extraDerivers?` | readonly `unknown`[] | KeyDeriver registry extension (see https://docs.rulvar.com/guide/journal-compatibility). Plumbed now, consumed by the matching kernel from M2. | [packages/core/src/engine/engine.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L173) |
| <a id="property-onescalation"></a> `onEscalation?` | (`result`) => \| [`EscalationDecision`](/api/@rulvar/core/type-aliases/EscalationDecision.md) \| `Promise`\&lt;[`EscalationDecision`](/api/@rulvar/core/type-aliases/EscalationDecision.md)\&gt; | The InProcessRunner escalation hook: receives escalated results when the call form cannot carry them; the returned decision is journaled as the authoritative escalation-decision entry. | [packages/core/src/engine/engine.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L165) |
| <a id="property-pricing"></a> `pricing?` | [`PriceTable`](/api/@rulvar/core/interfaces/PriceTable.md) | Versioned price table; wins over caps.pricing (M4-T06). | [packages/core/src/engine/engine.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L151) |
| <a id="property-redaction"></a> `redaction?` | \{ `maskEvents?`: `boolean`; \} | The default key-masking policy at the telemetry boundary. Default ON: key-shaped strings in every emitted WorkflowEvent are masked; never touches the journal. | [packages/core/src/engine/engine.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L186) |
| `redaction.maskEvents?` | `boolean` | - | [packages/core/src/engine/engine.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L186) |
| <a id="property-runners"></a> `runners?` | \{ `sandbox?`: [`ScriptRunner`](/api/@rulvar/core/interfaces/ScriptRunner.md); \} | Runner registrations beyond the built-in InProcessRunner (M6-T02). `sandbox` executes CompiledWorkflow values (WorkerSandboxRunner ships in @rulvar/planner); running or resuming a compiled workflow without one is a typed ConfigError. | [packages/core/src/engine/engine.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L158) |
| `runners.sandbox?` | [`ScriptRunner`](/api/@rulvar/core/interfaces/ScriptRunner.md) | - | [packages/core/src/engine/engine.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L158) |
| <a id="property-serialization"></a> `serialization?` | [`SerializationHook`](/api/@rulvar/core/interfaces/SerializationHook.md) | Redact/encrypt at the append/put boundaries, symmetric on load/get (M8-T04, OQ-22 executed). Applied by wrapping the configured stores; Engine.stores exposes the wrapped instances, so every reader passes one policy point. | [packages/core/src/engine/engine.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L180) |
| <a id="property-stores"></a> `stores?` | \{ `journal?`: [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md); `modelKnowledge?`: [`ModelKnowledgeStore`](/api/@rulvar/core/interfaces/ModelKnowledgeStore.md); `transcripts?`: [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md); \} | - | [packages/core/src/engine/engine.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L132) |
| `stores.journal?` | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) | Default InMemoryStore (resume disabled, loud warning). | [packages/core/src/engine/engine.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L134) |
| `stores.modelKnowledge?` | [`ModelKnowledgeStore`](/api/@rulvar/core/interfaces/ModelKnowledgeStore.md) | The ModelKnowledge claim store (M10-T03). Optional and OFF by default: an engine without it writes no kb entries at all. The runtime only ever receives the current()-only handle. | [packages/core/src/engine/engine.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L141) |
| `stores.transcripts?` | [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md) | - | [packages/core/src/engine/engine.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L135) |
