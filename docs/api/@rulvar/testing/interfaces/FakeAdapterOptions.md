[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / FakeAdapterOptions

# Interface: FakeAdapterOptions

Defined in: [packages/testing/src/fake-adapter.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L76)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agents"></a> `agents` | `Record`\&lt;`string`, [`FakeResponder`](/api/@rulvar/testing/type-aliases/FakeResponder.md)\&gt; | Patterns match on agentType, label, or a regex over the prompt; '*' is the fallback. | [packages/testing/src/fake-adapter.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L81) |
| <a id="property-capsoverrides"></a> `capsOverrides?` | `Partial`\&lt;[`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md)\&gt; | Declared capability fields layered over the fake defaults (the v1.74 experiment review): lets an offline test drive caps-driven runtime behavior, e.g. minOutputTokensPerTurn for the provider output floor, without a live adapter. | [packages/testing/src/fake-adapter.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L88) |
