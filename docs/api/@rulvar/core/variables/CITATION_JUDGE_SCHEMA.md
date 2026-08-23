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

Defined in: [packages/core/src/orchestrator/citation-audit.ts:699](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L699)

The audit judge's structured verdict schema (mirrors the claim judge).

## Type Declaration

| Name | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-additionalproperties"></a> `additionalProperties` | `false` | `false` | [packages/core/src/orchestrator/citation-audit.ts:717](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L717) |
| <a id="property-properties"></a> `properties` | \{ `verdicts`: \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \}; \} | - | [packages/core/src/orchestrator/citation-audit.ts:701](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L701) |
| `properties.verdicts` | \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:702](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L702) |
| `properties.verdicts.items` | \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:704](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L704) |
| `properties.verdicts.items.additionalProperties` | `false` | `false` | [packages/core/src/orchestrator/citation-audit.ts:712](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L712) |
| `properties.verdicts.items.properties` | \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \} | - | [packages/core/src/orchestrator/citation-audit.ts:706](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L706) |
| `properties.verdicts.items.properties.reason` | \{ `type`: `"string"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:709](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L709) |
| `properties.verdicts.items.properties.reason.type` | `"string"` | `'string'` | [packages/core/src/orchestrator/citation-audit.ts:709](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L709) |
| `properties.verdicts.items.properties.row` | \{ `type`: `"integer"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:707](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L707) |
| `properties.verdicts.items.properties.row.type` | `"integer"` | `'integer'` | [packages/core/src/orchestrator/citation-audit.ts:707](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L707) |
| `properties.verdicts.items.properties.verdict` | \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:708](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L708) |
| `properties.verdicts.items.properties.verdict.enum` | readonly \[`"supported"`, `"partial"`, `"unsupported"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:708](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L708) |
| `properties.verdicts.items.properties.verdict.type` | `"string"` | `'string'` | [packages/core/src/orchestrator/citation-audit.ts:708](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L708) |
| `properties.verdicts.items.required` | readonly \[`"row"`, `"verdict"`, `"reason"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:711](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L711) |
| `properties.verdicts.items.type` | `"object"` | `'object'` | [packages/core/src/orchestrator/citation-audit.ts:705](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L705) |
| `properties.verdicts.type` | `"array"` | `'array'` | [packages/core/src/orchestrator/citation-audit.ts:703](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L703) |
| <a id="property-required"></a> `required` | readonly \[`"verdicts"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:716](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L716) |
| <a id="property-type"></a> `type` | `"object"` | `'object'` | [packages/core/src/orchestrator/citation-audit.ts:700](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L700) |
