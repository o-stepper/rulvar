[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishValidationChild

# Interface: FinishValidationChild

Defined in: [packages/core/src/orchestrator/finish-validators.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L22)

One child as the finish validators see it (the RV-202 provenance
contract): a pure read of the durable state the orchestrator already
tracks, identical live and on replay.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-handle"></a> `handle` | `readonly` | `number` | The spawn handle (the journal seq, stable across resume). | [packages/core/src/orchestrator/finish-validators.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L24) |
| <a id="property-nodeid"></a> `nodeId` | `readonly` | `string` | The child's node identity, the same one acceptance reasons use. | [packages/core/src/orchestrator/finish-validators.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L26) |
| <a id="property-salvageableoutput"></a> `salvageableOutput?` | `readonly` | `boolean` | Present and true ONLY when acceptance.acceptValidatedTerminalOutputOnLimit is configured and this child settled 'limit' CARRYING a terminal output (the finalization reserve summary that, for a schema child, already validated against the declared output schema) that the acceptance arms WILL count: under acceptance.requireEvidenceFloor a below-floor child is never promoted (RV1207), so it is never marked either (RV1403). Acceptance counts a marked child as a success, so evidencePreservedValidator treats its text as part of the cited evidence pool. Absent in every other configuration, keeping the old pool exactly. | [packages/core/src/orchestrator/finish-validators.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L47) |
| <a id="property-salvageablepartial"></a> `salvageablePartial?` | `readonly` | `boolean` | The partial-arm twin of `salvageableOutput` (RV1403): present and true ONLY when acceptance.acceptPartialChildren is configured and this child settled 'limit' CARRYING a structured partial the acceptance arms WILL count (the output arm wins when both apply, and a below-floor child under requireEvidenceFloor is never marked). The accepted partial IS part of the composed result, so its citations are evidence: without the mark, an orchestrator quoting a partial the policy accepted was flagged by `requireKnown` as fabricating citations. | [packages/core/src/orchestrator/finish-validators.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L59) |
| <a id="property-status"></a> `status` | `readonly` | `string` | The terminal status, or 'running' for a child unsettled at finish time. | [packages/core/src/orchestrator/finish-validators.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L28) |
| <a id="property-text"></a> `text` | `readonly` | `string` | The child's full output serialized (a raw string verbatim, anything else JSON; a failed child's errorMessage), '' while unsettled. The same serialization the child result evidence tools page. | [packages/core/src/orchestrator/finish-validators.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L34) |
