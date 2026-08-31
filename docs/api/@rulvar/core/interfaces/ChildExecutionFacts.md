[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ChildExecutionFacts

# Interface: ChildExecutionFacts

Defined in: [packages/core/src/orchestrator/handles.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L74)

One child's execution facts, folded ONLY from replay-stable settled
material (RV1503): the journaled per-dispatch reconciliation records
and the journaled usage, which a resumed run restores verbatim.
Dollars are deliberately absent: replay re-prices from the CURRENT
price table, so a money figure here would drift across resumes while
these counters cannot.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-inputtokens"></a> `inputTokens` | `number` | - | [packages/core/src/orchestrator/handles.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L79) |
| <a id="property-outputtokens"></a> `outputTokens` | `number` | - | [packages/core/src/orchestrator/handles.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L80) |
| <a id="property-wireidsmissing"></a> `wireIdsMissing` | `number` | Wire requests no response id names (the invoice cardinality rule). | [packages/core/src/orchestrator/handles.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L78) |
| <a id="property-wirerequests"></a> `wireRequests` | `number` | Provider HTTP requests the child's dispatches made (RV1210 semantics). | [packages/core/src/orchestrator/handles.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L76) |
