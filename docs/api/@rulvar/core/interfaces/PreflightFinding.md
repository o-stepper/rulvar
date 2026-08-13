[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightFinding

# Interface: PreflightFinding

Defined in: [packages/core/src/engine/preflight.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L332)

One linter verdict; `spawn` names the wave entry it is about.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `string` | Stable kebab-case code for machine consumption. | [packages/core/src/engine/preflight.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L335) |
| <a id="property-message"></a> `message` | `string` | - | [packages/core/src/engine/preflight.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L336) |
| <a id="property-severity"></a> `severity` | `"error"` \| `"info"` \| `"warning"` | - | [packages/core/src/engine/preflight.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L333) |
| <a id="property-spawn"></a> `spawn?` | `string` | - | [packages/core/src/engine/preflight.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L337) |
