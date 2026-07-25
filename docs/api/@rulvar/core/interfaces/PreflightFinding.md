[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightFinding

# Interface: PreflightFinding

Defined in: [packages/core/src/engine/preflight.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L166)

One linter verdict; `spawn` names the wave entry it is about.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `string` | Stable kebab-case code for machine consumption. | [packages/core/src/engine/preflight.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L169) |
| <a id="property-message"></a> `message` | `string` | - | [packages/core/src/engine/preflight.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L170) |
| <a id="property-severity"></a> `severity` | `"error"` \| `"info"` \| `"warning"` | - | [packages/core/src/engine/preflight.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L167) |
| <a id="property-spawn"></a> `spawn?` | `string` | - | [packages/core/src/engine/preflight.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L171) |
