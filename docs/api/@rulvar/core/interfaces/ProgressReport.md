[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ProgressReport

# Interface: ProgressReport

Defined in: [packages/core/src/tools/progress.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/progress.ts#L33)

One progress report: what the agent has established so far. Captured
as [AgentResult.partial](/api/@rulvar/core/interfaces/AgentResult.md#property-partial) (normalized: absent arrays become
empty) when the invocation terminates with status 'limit'.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-evidence"></a> `evidence` | `string`[] | Evidence references backing the facts (file:line or recorded ids). | [packages/core/src/tools/progress.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/progress.ts#L37) |
| <a id="property-facts"></a> `facts` | `string`[] | New facts established, each a standalone claim line. | [packages/core/src/tools/progress.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/progress.ts#L35) |
| <a id="property-note"></a> `note?` | `string` | Optional short status note. | [packages/core/src/tools/progress.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/progress.ts#L41) |
| <a id="property-questions"></a> `questions` | `string`[] | Remaining unresolved questions. | [packages/core/src/tools/progress.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/progress.ts#L39) |
