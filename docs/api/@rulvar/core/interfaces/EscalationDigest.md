[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EscalationDigest

# Interface: EscalationDigest

Defined in: [packages/core/src/orchestrator/wake.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L78)

The escalation block of a digest.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-deadlineat"></a> `deadlineAt?` | `string` | Flavor B only. | [packages/core/src/orchestrator/wake.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L86) |
| <a id="property-flavor"></a> `flavor` | `"A"` \| `"B"` | - | [packages/core/src/orchestrator/wake.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L84) |
| <a id="property-kind"></a> `kind` | `string` | - | [packages/core/src/orchestrator/wake.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L83) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/core/src/orchestrator/wake.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L80) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/core/src/orchestrator/wake.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L79) |
| <a id="property-reportref"></a> `reportRef` | `number` | seq of the terminal escalated entry or the suspended escalate entry. | [packages/core/src/orchestrator/wake.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L82) |
