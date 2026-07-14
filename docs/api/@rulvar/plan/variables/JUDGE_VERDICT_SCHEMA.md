[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / JUDGE\_VERDICT\_SCHEMA

# Variable: JUDGE\_VERDICT\_SCHEMA

```ts
const JUDGE_VERDICT_SCHEMA: {
  additionalProperties: false;
  properties: {
     pass: {
        type: "boolean";
     };
     reason: {
        type: "string";
     };
  };
  required: readonly ["pass", "reason"];
  type: "object";
};
```

Defined in: [packages/plan/src/ladder.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L170)

The forced verdict schema of the judge gate.

## Type Declaration

| Name | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-additionalproperties"></a> `additionalProperties` | `false` | `false` | [packages/plan/src/ladder.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L177) |
| <a id="property-properties"></a> `properties` | \{ `pass`: \{ `type`: `"boolean"`; \}; `reason`: \{ `type`: `"string"`; \}; \} | - | [packages/plan/src/ladder.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L172) |
| `properties.pass` | \{ `type`: `"boolean"`; \} | - | [packages/plan/src/ladder.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L173) |
| `properties.pass.type` | `"boolean"` | `'boolean'` | [packages/plan/src/ladder.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L173) |
| `properties.reason` | \{ `type`: `"string"`; \} | - | [packages/plan/src/ladder.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L174) |
| `properties.reason.type` | `"string"` | `'string'` | [packages/plan/src/ladder.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L174) |
| <a id="property-required"></a> `required` | readonly \[`"pass"`, `"reason"`\] | - | [packages/plan/src/ladder.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L176) |
| <a id="property-type"></a> `type` | `"object"` | `'object'` | [packages/plan/src/ladder.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L171) |
