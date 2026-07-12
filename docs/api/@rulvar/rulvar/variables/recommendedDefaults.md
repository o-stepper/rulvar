[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / recommendedDefaults

# Variable: recommendedDefaults

```ts
const recommendedDefaults: {
  floors: QualityFloors;
  routing: Partial<Record<InvocationRole, ModelSpec>>;
};
```

Defined in: [packages/rulvar/src/defaults.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/defaults.ts#L19)

Drop-in engine defaults: `createEngine({ ..., defaults: { routing:
recommendedDefaults.routing, roleFloors: recommendedDefaults.floors } })`.
Hosts override freely; these are data, not engine semantics. The
floors pin orchestrate and plan to strong models as hard router
constraints (docs/04, section "Role quality floors"; M4-T09): weak
model defaults are forbidden for plan and orchestrate work, and no
advice may override or weaken a floor.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-floors"></a> `floors` | [`QualityFloors`](/api/@rulvar/rulvar/interfaces/QualityFloors.md) | [packages/rulvar/src/defaults.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/defaults.ts#L21) |
| <a id="property-routing"></a> `routing` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt; | [packages/rulvar/src/defaults.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/defaults.ts#L20) |
