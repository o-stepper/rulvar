[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightFinding

# Interface: PreflightFinding

Defined in: [packages/core/src/engine/preflight.ts:404](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L404)

One linter verdict; `spawn` names the wave entry it is about.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `string` | Stable kebab-case code for machine consumption. | [packages/core/src/engine/preflight.ts:407](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L407) |
| <a id="property-message"></a> `message` | `string` | - | [packages/core/src/engine/preflight.ts:408](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L408) |
| <a id="property-severity"></a> `severity` | `"error"` \| `"info"` \| `"warning"` | - | [packages/core/src/engine/preflight.ts:405](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L405) |
| <a id="property-spawn"></a> `spawn?` | `string` | - | [packages/core/src/engine/preflight.ts:409](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L409) |
