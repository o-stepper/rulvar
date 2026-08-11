[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightFinding

# Interface: PreflightFinding

Defined in: [packages/core/src/engine/preflight.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L297)

One linter verdict; `spawn` names the wave entry it is about.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `string` | Stable kebab-case code for machine consumption. | [packages/core/src/engine/preflight.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L300) |
| <a id="property-message"></a> `message` | `string` | - | [packages/core/src/engine/preflight.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L301) |
| <a id="property-severity"></a> `severity` | `"error"` \| `"info"` \| `"warning"` | - | [packages/core/src/engine/preflight.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L298) |
| <a id="property-spawn"></a> `spawn?` | `string` | - | [packages/core/src/engine/preflight.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L302) |
