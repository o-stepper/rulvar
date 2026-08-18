[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CITATION\_JUDGE\_SCHEMA

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

Defined in: `packages/core/dist/index.d.ts`

The audit judge's structured verdict schema (mirrors the claim judge).

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-additionalproperties"></a> `additionalProperties` | `false` | `packages/core/dist/index.d.ts` |
| <a id="property-properties"></a> `properties` | \{ `verdicts`: \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \}; \} | `packages/core/dist/index.d.ts` |
| `properties.verdicts` | \{ `items`: \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \}; `type`: `"array"`; \} | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items` | \{ `additionalProperties`: `false`; `properties`: \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \}; `required`: readonly \[`"row"`, `"verdict"`, `"reason"`\]; `type`: `"object"`; \} | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items.additionalProperties` | `false` | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items.properties` | \{ `reason`: \{ `type`: `"string"`; \}; `row`: \{ `type`: `"integer"`; \}; `verdict`: \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \}; \} | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items.properties.reason` | \{ `type`: `"string"`; \} | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items.properties.reason.type` | `"string"` | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items.properties.row` | \{ `type`: `"integer"`; \} | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items.properties.row.type` | `"integer"` | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items.properties.verdict` | \{ `enum`: readonly \[`"supported"`, `"partial"`, `"unsupported"`\]; `type`: `"string"`; \} | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items.properties.verdict.enum` | readonly \[`"supported"`, `"partial"`, `"unsupported"`\] | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items.properties.verdict.type` | `"string"` | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items.required` | readonly \[`"row"`, `"verdict"`, `"reason"`\] | `packages/core/dist/index.d.ts` |
| `properties.verdicts.items.type` | `"object"` | `packages/core/dist/index.d.ts` |
| `properties.verdicts.type` | `"array"` | `packages/core/dist/index.d.ts` |
| <a id="property-required"></a> `required` | readonly \[`"verdicts"`\] | `packages/core/dist/index.d.ts` |
| <a id="property-type"></a> `type` | `"object"` | `packages/core/dist/index.d.ts` |
