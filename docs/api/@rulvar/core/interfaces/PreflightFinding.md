[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightFinding

# Interface: PreflightFinding

Defined in: [packages/core/src/engine/preflight.ts:344](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L344)

One linter verdict; `spawn` names the wave entry it is about.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `string` | Stable kebab-case code for machine consumption. | [packages/core/src/engine/preflight.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L347) |
| <a id="property-message"></a> `message` | `string` | - | [packages/core/src/engine/preflight.ts:348](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L348) |
| <a id="property-severity"></a> `severity` | `"error"` \| `"info"` \| `"warning"` | - | [packages/core/src/engine/preflight.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L345) |
| <a id="property-spawn"></a> `spawn?` | `string` | - | [packages/core/src/engine/preflight.ts:349](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L349) |
