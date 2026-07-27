[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightFinding

# Interface: PreflightFinding

Defined in: [packages/core/src/engine/preflight.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L237)

One linter verdict; `spawn` names the wave entry it is about.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `string` | Stable kebab-case code for machine consumption. | [packages/core/src/engine/preflight.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L240) |
| <a id="property-message"></a> `message` | `string` | - | [packages/core/src/engine/preflight.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L241) |
| <a id="property-severity"></a> `severity` | `"error"` \| `"info"` \| `"warning"` | - | [packages/core/src/engine/preflight.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L238) |
| <a id="property-spawn"></a> `spawn?` | `string` | - | [packages/core/src/engine/preflight.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L242) |
