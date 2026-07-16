[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CreateEngineOptions

# Interface: CreateEngineOptions

Defined in: [packages/core/src/engine/engine.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L125)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-adapters"></a> `adapters` | [`ProviderAdapter`](/api/@rulvar/core/interfaces/ProviderAdapter.md)[] | - | [packages/core/src/engine/engine.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L126) |
| <a id="property-budgetdefaults"></a> `budgetDefaults?` | [`BudgetDefaults`](/api/@rulvar/core/interfaces/BudgetDefaults.md) | - | [packages/core/src/engine/engine.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L139) |
| <a id="property-concurrency"></a> `concurrency?` | \{ `perProvider?`: `Record`\&lt;`string`, `number`\&gt;; `perRun?`: `number`; \} | - | [packages/core/src/engine/engine.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L140) |
| `concurrency.perProvider?` | `Record`\&lt;`string`, `number`\&gt; | Per-adapter-id caps; unlimited unless configured (Appendix A; M4-T07). | [packages/core/src/engine/engine.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L143) |
| `concurrency.perRun?` | `number` | - | [packages/core/src/engine/engine.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L141) |
| <a id="property-defaults"></a> `defaults?` | [`EngineDefaults`](/api/@rulvar/core/interfaces/EngineDefaults.md) | - | [packages/core/src/engine/engine.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L138) |
| <a id="property-extraderivers"></a> `extraDerivers?` | readonly `unknown`[] | KeyDeriver registry extension (see https://docs.rulvar.com/guide/journal-compatibility). Plumbed now, consumed by the matching kernel from M2. | [packages/core/src/engine/engine.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L168) |
| <a id="property-onescalation"></a> `onEscalation?` | (`result`) => \| [`EscalationDecision`](/api/@rulvar/core/type-aliases/EscalationDecision.md) \| `Promise`\&lt;[`EscalationDecision`](/api/@rulvar/core/type-aliases/EscalationDecision.md)\&gt; | The InProcessRunner escalation hook: receives escalated results when the call form cannot carry them; the returned decision is journaled as the authoritative escalation-decision entry. | [packages/core/src/engine/engine.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L160) |
| <a id="property-pricing"></a> `pricing?` | [`PriceTable`](/api/@rulvar/core/interfaces/PriceTable.md) | Versioned price table; wins over caps.pricing (M4-T06). | [packages/core/src/engine/engine.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L146) |
| <a id="property-redaction"></a> `redaction?` | \{ `maskEvents?`: `boolean`; \} | The default key-masking policy at the telemetry boundary. Default ON: key-shaped strings in every emitted WorkflowEvent are masked; never touches the journal. | [packages/core/src/engine/engine.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L181) |
| `redaction.maskEvents?` | `boolean` | - | [packages/core/src/engine/engine.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L181) |
| <a id="property-runners"></a> `runners?` | \{ `sandbox?`: [`ScriptRunner`](/api/@rulvar/core/interfaces/ScriptRunner.md); \} | Runner registrations beyond the built-in InProcessRunner (M6-T02). `sandbox` executes CompiledWorkflow values (WorkerSandboxRunner ships in @rulvar/planner); running or resuming a compiled workflow without one is a typed ConfigError. | [packages/core/src/engine/engine.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L153) |
| `runners.sandbox?` | [`ScriptRunner`](/api/@rulvar/core/interfaces/ScriptRunner.md) | - | [packages/core/src/engine/engine.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L153) |
| <a id="property-serialization"></a> `serialization?` | [`SerializationHook`](/api/@rulvar/core/interfaces/SerializationHook.md) | Redact/encrypt at the append/put boundaries, symmetric on load/get (M8-T04, OQ-22 executed). Applied by wrapping the configured stores; Engine.stores exposes the wrapped instances, so every reader passes one policy point. | [packages/core/src/engine/engine.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L175) |
| <a id="property-stores"></a> `stores?` | \{ `journal?`: [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md); `modelKnowledge?`: [`ModelKnowledgeStore`](/api/@rulvar/core/interfaces/ModelKnowledgeStore.md); `transcripts?`: [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md); \} | - | [packages/core/src/engine/engine.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L127) |
| `stores.journal?` | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) | Default InMemoryStore (resume disabled, loud warning). | [packages/core/src/engine/engine.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L129) |
| `stores.modelKnowledge?` | [`ModelKnowledgeStore`](/api/@rulvar/core/interfaces/ModelKnowledgeStore.md) | The ModelKnowledge claim store (M10-T03). Optional and OFF by default: an engine without it writes no kb entries at all. The runtime only ever receives the current()-only handle. | [packages/core/src/engine/engine.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L136) |
| `stores.transcripts?` | [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md) | - | [packages/core/src/engine/engine.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L130) |
