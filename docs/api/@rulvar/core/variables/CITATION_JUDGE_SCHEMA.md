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

Defined in: [packages/core/src/orchestrator/citation-audit.ts:759](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L759)

The audit judge's structured verdict schema (mirrors the claim judge).

## Type Declaration

| Name | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-additionalproperties"></a> `additionalProperties` | `false` | `false` | [packages/core/src/orchestrator/citation-audit.ts:777](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L777) |
| <a id="property-properties"></a> `properties` | \{ `verdicts`: \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \}; \} | - | [packages/core/src/orchestrator/citation-audit.ts:761](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L761) |
| `properties.verdicts` | \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:762](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L762) |
| `properties.verdicts.items` | \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:764](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L764) |
| `properties.verdicts.items.additionalProperties` | `false` | `false` | [packages/core/src/orchestrator/citation-audit.ts:772](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L772) |
| `properties.verdicts.items.properties` | \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \} | - | [packages/core/src/orchestrator/citation-audit.ts:766](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L766) |
| `properties.verdicts.items.properties.reason` | \{ `type`: `"string"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:769](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L769) |
| `properties.verdicts.items.properties.reason.type` | `"string"` | `'string'` | [packages/core/src/orchestrator/citation-audit.ts:769](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L769) |
| `properties.verdicts.items.properties.row` | \{ `type`: `"integer"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:767](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L767) |
| `properties.verdicts.items.properties.row.type` | `"integer"` | `'integer'` | [packages/core/src/orchestrator/citation-audit.ts:767](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L767) |
| `properties.verdicts.items.properties.verdict` | \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:768](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L768) |
| `properties.verdicts.items.properties.verdict.enum` | readonly \[`"supported"`, `"partial"`, `"unsupported"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:768](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L768) |
| `properties.verdicts.items.properties.verdict.type` | `"string"` | `'string'` | [packages/core/src/orchestrator/citation-audit.ts:768](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L768) |
| `properties.verdicts.items.required` | readonly \[`"row"`, `"verdict"`, `"reason"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:771](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L771) |
| `properties.verdicts.items.type` | `"object"` | `'object'` | [packages/core/src/orchestrator/citation-audit.ts:765](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L765) |
| `properties.verdicts.type` | `"array"` | `'array'` | [packages/core/src/orchestrator/citation-audit.ts:763](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L763) |
| <a id="property-required"></a> `required` | readonly \[`"verdicts"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:776](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L776) |
| <a id="property-type"></a> `type` | `"object"` | `'object'` | [packages/core/src/orchestrator/citation-audit.ts:760](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L760) |
