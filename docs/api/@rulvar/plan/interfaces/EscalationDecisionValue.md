[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / EscalationDecisionValue

# Interface: EscalationDecisionValue

Defined in: [packages/plan/src/escalation.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L41)

The authoritative escalation-decision entry value (the
producer contract of LineageIndex and foldTermination). Exactly one
such entry per report; the debit is atomic with the append and the
balance-after is embedded (DEF-2). A decision whose counting debit was
DENIED carries `countsAgainstLimit: false` plus `capExceeded: true`:
the termination.denied entry written strictly before is the counting
record, and the folds stay replay-strict.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissions"></a> `admissions?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)[] | Decomposition admissions (spawn debits ride this entry; 11.3 b). | [packages/plan/src/escalation.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L57) |
| <a id="property-capexceeded"></a> `capExceeded?` | `boolean` | The counting debit was denied: the cap is the message. | [packages/plan/src/escalation.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L59) |
| <a id="property-countsagainstlimit"></a> `countsAgainstLimit` | `boolean` | - | [packages/plan/src/escalation.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L49) |
| <a id="property-debits"></a> `debits?` | [`EscalationDebitRow`](/api/@rulvar/plan/interfaces/EscalationDebitRow.md)[] | Class-level form: one entry, an array of per-lineage debits. | [packages/plan/src/escalation.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L55) |
| <a id="property-decision"></a> `decision` | [`EscalationDecision`](/api/@rulvar/rulvar/type-aliases/EscalationDecision.md) | - | [packages/plan/src/escalation.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L46) |
| <a id="property-decisiontype"></a> `decisionType` | `"escalation-decision"` | - | [packages/plan/src/escalation.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L42) |
| <a id="property-escalationunitsafter"></a> `escalationUnitsAfter?` | `number` | Present exactly when a counting debit executed (fold-asserted). | [packages/plan/src/escalation.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L51) |
| <a id="property-logicaltaskid"></a> `logicalTaskId?` | `string` | Single-target form; the class form carries `debits` instead. | [packages/plan/src/escalation.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L44) |
| <a id="property-nodeid"></a> `nodeId?` | `string` | - | [packages/plan/src/escalation.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L45) |
| <a id="property-reportref"></a> `reportRef` | `number` | Seq of the terminal escalated entry or the suspended escalate entry. | [packages/plan/src/escalation.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L48) |
| <a id="property-resolvedby"></a> `resolvedBy` | `"default"` \| `"class"` \| `"live"` \| `"revision-transform"` | How the decision was reached (the plan.decision origins). | [packages/plan/src/escalation.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/escalation.ts#L53) |
