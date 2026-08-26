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

Defined in: [packages/core/src/orchestrator/citation-audit.ts:801](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L801)

The audit judge's structured verdict schema (mirrors the claim judge).

## Type Declaration

| Name | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-additionalproperties"></a> `additionalProperties` | `false` | `false` | [packages/core/src/orchestrator/citation-audit.ts:819](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L819) |
| <a id="property-properties"></a> `properties` | \{ `verdicts`: \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \}; \} | - | [packages/core/src/orchestrator/citation-audit.ts:803](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L803) |
| `properties.verdicts` | \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:804](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L804) |
| `properties.verdicts.items` | \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:806](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L806) |
| `properties.verdicts.items.additionalProperties` | `false` | `false` | [packages/core/src/orchestrator/citation-audit.ts:814](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L814) |
| `properties.verdicts.items.properties` | \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \} | - | [packages/core/src/orchestrator/citation-audit.ts:808](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L808) |
| `properties.verdicts.items.properties.reason` | \{ `type`: `"string"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:811](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L811) |
| `properties.verdicts.items.properties.reason.type` | `"string"` | `'string'` | [packages/core/src/orchestrator/citation-audit.ts:811](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L811) |
| `properties.verdicts.items.properties.row` | \{ `type`: `"integer"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:809](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L809) |
| `properties.verdicts.items.properties.row.type` | `"integer"` | `'integer'` | [packages/core/src/orchestrator/citation-audit.ts:809](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L809) |
| `properties.verdicts.items.properties.verdict` | \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \} | - | [packages/core/src/orchestrator/citation-audit.ts:810](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L810) |
| `properties.verdicts.items.properties.verdict.enum` | readonly \[`"supported"`, `"partial"`, `"unsupported"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:810](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L810) |
| `properties.verdicts.items.properties.verdict.type` | `"string"` | `'string'` | [packages/core/src/orchestrator/citation-audit.ts:810](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L810) |
| `properties.verdicts.items.required` | readonly \[`"row"`, `"verdict"`, `"reason"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:813](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L813) |
| `properties.verdicts.items.type` | `"object"` | `'object'` | [packages/core/src/orchestrator/citation-audit.ts:807](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L807) |
| `properties.verdicts.type` | `"array"` | `'array'` | [packages/core/src/orchestrator/citation-audit.ts:805](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L805) |
| <a id="property-required"></a> `required` | readonly \[`"verdicts"`\] | - | [packages/core/src/orchestrator/citation-audit.ts:818](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L818) |
| <a id="property-type"></a> `type` | `"object"` | `'object'` | [packages/core/src/orchestrator/citation-audit.ts:802](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L802) |
