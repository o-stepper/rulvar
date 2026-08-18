[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CITATION\_JUDGE\_SCHEMA

# Variable: CITATION\_JUDGE\_SCHEMA

```ts
const CITATION_JUDGE_SCHEMA: {
  additionalProperties: false;
  properties: {
     verdicts: {
        items: {
           additionalProperties: false;
           properties: {
              reason: {
                 type: "string";
              };
              row: {
                 type: "integer";
              };
              verdict: {
                 enum: readonly ["supported", "partial", "unsupported"];
                 type: "string";
              };
           };
           required: readonly ["row", "verdict", "reason"];
           type: "object";
        };
        type: "array";
     };
  };
  required: readonly ["verdicts"];
  type: "object";
};
```

Defined in: [packages/core/src/orchestrator/citation-audit.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L314)

The audit judge's structured verdict schema (mirrors the claim judge).

## Type Declaration

| Name | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-additionalproperties"></a> `additionalProperties` | `false` | `false` | [packages/core/src/orchestrator/citation-audit.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L332) |
| <a id="property-properties"></a> `properties` | \{ `verdicts`: \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \}; \} | - | [packages/core/src/orchestrator/citation-audit.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L316) |
| `properties.verdicts` | \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:317](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L317) |
| `properties.verdicts.items` | \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:319](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L319) |
| `properties.verdicts.items.additionalProperties` | `false` | `false` | [packages/core/src/orchestrator/citation-audit.ts:327](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L327) |
| `properties.verdicts.items.properties` | \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \} | - | [packages/core/src/orchestrator/citation-audit.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L321) |
| `properties.verdicts.items.properties.reason` | \{ `type`: `"string"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L324) |
| `properties.verdicts.items.properties.reason.type` | `"string"` | `'string'` | [packages/core/src/orchestrator/citation-audit.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L324) |
| `properties.verdicts.items.properties.row` | \{ `type`: `"integer"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L322) |
| `properties.verdicts.items.properties.row.type` | `"integer"` | `'integer'` | [packages/core/src/orchestrator/citation-audit.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L322) |
| `properties.verdicts.items.properties.verdict` | \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L323) |
| `properties.verdicts.items.properties.verdict.enum` | readonly \[`"supported"`, `"partial"`, `"unsupported"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L323) |
| `properties.verdicts.items.properties.verdict.type` | `"string"` | `'string'` | [packages/core/src/orchestrator/citation-audit.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L323) |
| `properties.verdicts.items.required` | readonly \[`"row"`, `"verdict"`, `"reason"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:326](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L326) |
| `properties.verdicts.items.type` | `"object"` | `'object'` | [packages/core/src/orchestrator/citation-audit.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L320) |
| `properties.verdicts.type` | `"array"` | `'array'` | [packages/core/src/orchestrator/citation-audit.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L318) |
| <a id="property-required"></a> `required` | readonly \[`"verdicts"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:331](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L331) |
| <a id="property-type"></a> `type` | `"object"` | `'object'` | [packages/core/src/orchestrator/citation-audit.ts:315](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L315) |
