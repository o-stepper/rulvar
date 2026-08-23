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

Defined in: [packages/core/src/orchestrator/citation-audit.ts:656](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L656)

The audit judge's structured verdict schema (mirrors the claim judge).

## Type Declaration

| Name | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-additionalproperties"></a> `additionalProperties` | `false` | `false` | [packages/core/src/orchestrator/citation-audit.ts:674](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L674) |
| <a id="property-properties"></a> `properties` | \{ `verdicts`: \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \}; \} | - | [packages/core/src/orchestrator/citation-audit.ts:658](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L658) |
| `properties.verdicts` | \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:659](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L659) |
| `properties.verdicts.items` | \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:661](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L661) |
| `properties.verdicts.items.additionalProperties` | `false` | `false` | [packages/core/src/orchestrator/citation-audit.ts:669](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L669) |
| `properties.verdicts.items.properties` | \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \} | - | [packages/core/src/orchestrator/citation-audit.ts:663](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L663) |
| `properties.verdicts.items.properties.reason` | \{ `type`: `"string"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:666](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L666) |
| `properties.verdicts.items.properties.reason.type` | `"string"` | `'string'` | [packages/core/src/orchestrator/citation-audit.ts:666](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L666) |
| `properties.verdicts.items.properties.row` | \{ `type`: `"integer"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:664](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L664) |
| `properties.verdicts.items.properties.row.type` | `"integer"` | `'integer'` | [packages/core/src/orchestrator/citation-audit.ts:664](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L664) |
| `properties.verdicts.items.properties.verdict` | \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:665](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L665) |
| `properties.verdicts.items.properties.verdict.enum` | readonly \[`"supported"`, `"partial"`, `"unsupported"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:665](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L665) |
| `properties.verdicts.items.properties.verdict.type` | `"string"` | `'string'` | [packages/core/src/orchestrator/citation-audit.ts:665](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L665) |
| `properties.verdicts.items.required` | readonly \[`"row"`, `"verdict"`, `"reason"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:668](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L668) |
| `properties.verdicts.items.type` | `"object"` | `'object'` | [packages/core/src/orchestrator/citation-audit.ts:662](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L662) |
| `properties.verdicts.type` | `"array"` | `'array'` | [packages/core/src/orchestrator/citation-audit.ts:660](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L660) |
| <a id="property-required"></a> `required` | readonly \[`"verdicts"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:673](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L673) |
| <a id="property-type"></a> `type` | `"object"` | `'object'` | [packages/core/src/orchestrator/citation-audit.ts:657](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L657) |
