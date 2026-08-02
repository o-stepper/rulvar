[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimPoolReading

# Interface: ClaimPoolReading

Defined in: [packages/core/src/orchestrator/consistency.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L44)

One pool sentence read against a draft sentence, with its reporter.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-excerpt"></a> `excerpt` | `string` | The pool sentence, whitespace-collapsed and cut to `maxExcerptChars`. An excerpt, never a quotation: it exists so a judge (or a reader) can hold the two readings against each other, not so a machine can re-parse it. | [packages/core/src/orchestrator/consistency.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L53) |
| <a id="property-nodeid"></a> `nodeId` | `string` | The child's node identity, the same one acceptance reasons use. | [packages/core/src/orchestrator/consistency.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L46) |
