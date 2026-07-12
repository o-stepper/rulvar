[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / KbProposeInput

# Interface: KbProposeInput

Defined in: [packages/plan/src/tools.ts:299](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L299)

The model-facing kb_propose payload (tier-relative subject).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-evidencerefs"></a> `evidenceRefs?` | `number`[] | [packages/plan/src/tools.ts:306](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L306) |
| <a id="property-logicaltaskid"></a> `logicalTaskId?` | `string` | [packages/plan/src/tools.ts:304](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L304) |
| <a id="property-note"></a> `note?` | `string` | [packages/plan/src/tools.ts:305](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L305) |
| <a id="property-polarity"></a> `polarity` | `"strength"` \| `"weakness"` | [packages/plan/src/tools.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L302) |
| <a id="property-subject"></a> `subject` | \{ `tier`: `number`; \} | [packages/plan/src/tools.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L300) |
| `subject.tier` | `number` | [packages/plan/src/tools.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L300) |
| <a id="property-taskclass"></a> `taskClass` | `string` | [packages/plan/src/tools.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L301) |
| <a id="property-trigger"></a> `trigger` | \| `"escalation"` \| `"no-progress"` \| `"error"` \| `"limit"` \| `"schema-exhausted"` \| `"verify-failed"` | [packages/plan/src/tools.ts:303](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L303) |
