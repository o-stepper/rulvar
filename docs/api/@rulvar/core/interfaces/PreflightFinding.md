[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightFinding

# Interface: PreflightFinding

Defined in: [packages/core/src/engine/preflight.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L210)

One linter verdict; `spawn` names the wave entry it is about.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `string` | Stable kebab-case code for machine consumption. | [packages/core/src/engine/preflight.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L213) |
| <a id="property-message"></a> `message` | `string` | - | [packages/core/src/engine/preflight.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L214) |
| <a id="property-severity"></a> `severity` | `"error"` \| `"info"` \| `"warning"` | - | [packages/core/src/engine/preflight.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L211) |
| <a id="property-spawn"></a> `spawn?` | `string` | - | [packages/core/src/engine/preflight.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L215) |
