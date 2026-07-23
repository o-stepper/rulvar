[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ProgressReport

# Interface: ProgressReport

Defined in: `packages/core/dist/index.d.ts`

One progress report: what the agent has established so far. Captured
as [AgentResult.partial](/api/@rulvar/rulvar/interfaces/AgentResult.md#property-partial) (normalized: absent arrays become
empty) when the invocation terminates with status 'limit'.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-evidence"></a> `evidence` | `string`[] | Evidence references backing the facts (file:line or recorded ids). | `packages/core/dist/index.d.ts` |
| <a id="property-facts"></a> `facts` | `string`[] | New facts established, each a standalone claim line. | `packages/core/dist/index.d.ts` |
| <a id="property-note"></a> `note?` | `string` | Optional short status note. | `packages/core/dist/index.d.ts` |
| <a id="property-questions"></a> `questions` | `string`[] | Remaining unresolved questions. | `packages/core/dist/index.d.ts` |
