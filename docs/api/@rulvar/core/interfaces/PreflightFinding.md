[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightFinding

# Interface: PreflightFinding

Defined in: [packages/core/src/engine/preflight.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L273)

One linter verdict; `spawn` names the wave entry it is about.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `string` | Stable kebab-case code for machine consumption. | [packages/core/src/engine/preflight.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L276) |
| <a id="property-message"></a> `message` | `string` | - | [packages/core/src/engine/preflight.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L277) |
| <a id="property-severity"></a> `severity` | `"error"` \| `"info"` \| `"warning"` | - | [packages/core/src/engine/preflight.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L274) |
| <a id="property-spawn"></a> `spawn?` | `string` | - | [packages/core/src/engine/preflight.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L278) |
