[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / CreateTestEngineOptions

# Interface: CreateTestEngineOptions

Defined in: [packages/testing/src/test-engine.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/test-engine.ts#L35)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agents"></a> `agents` | `Record`\&lt;`string`, [`FakeResponder`](/api/@rulvar/testing/type-aliases/FakeResponder.md)\&gt; | - | [packages/testing/src/test-engine.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/test-engine.ts#L36) |
| <a id="property-budgetdefaults"></a> `budgetDefaults?` | [`BudgetDefaults`](/api/@rulvar/rulvar/interfaces/BudgetDefaults.md) | - | [packages/testing/src/test-engine.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/test-engine.ts#L39) |
| <a id="property-concurrency"></a> `concurrency?` | \{ `perProvider?`: `Record`\&lt;`string`, `number`\&gt;; `perRun?`: `number`; \} | - | [packages/testing/src/test-engine.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/test-engine.ts#L40) |
| `concurrency.perProvider?` | `Record`\&lt;`string`, `number`\&gt; | - | `packages/core/dist/index.d.ts` |
| `concurrency.perRun?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-profiles"></a> `profiles?` | `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)\&gt; | Additional profiles; every agents key is auto-registered as an empty profile. | [packages/testing/src/test-engine.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/test-engine.ts#L38) |
