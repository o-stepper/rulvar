[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectSweepReport

# Interface: EffectSweepReport

Defined in: [packages/effects/src/reconciler.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L23)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-authorizationtimeouts"></a> `authorizationTimeouts` | `number` | Standalone authorization-timeout refusals appended. | [packages/effects/src/reconciler.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L31) |
| <a id="property-quarantined"></a> `quarantined` | \{ `intentSeq`: `number`; `reason`: `string`; \}[] | - | [packages/effects/src/reconciler.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L26) |
| <a id="property-recovered"></a> `recovered` | \{ `intentSeq`: `number`; `report`: [`EffectRecoveryReport`](/api/@rulvar/effects/type-aliases/EffectRecoveryReport.md); \}[] | - | [packages/effects/src/reconciler.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L27) |
| <a id="property-swept"></a> `swept` | `number` | Machines the sweep examined. | [packages/effects/src/reconciler.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L25) |
| <a id="property-waiting"></a> `waiting` | `number` | Open machines legitimately waiting inside their budgets. | [packages/effects/src/reconciler.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L29) |
