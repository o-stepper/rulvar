[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightFinding

# Interface: PreflightFinding

Defined in: [packages/core/src/engine/preflight.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L202)

One linter verdict; `spawn` names the wave entry it is about.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `string` | Stable kebab-case code for machine consumption. | [packages/core/src/engine/preflight.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L205) |
| <a id="property-message"></a> `message` | `string` | - | [packages/core/src/engine/preflight.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L206) |
| <a id="property-severity"></a> `severity` | `"error"` \| `"info"` \| `"warning"` | - | [packages/core/src/engine/preflight.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L203) |
| <a id="property-spawn"></a> `spawn?` | `string` | - | [packages/core/src/engine/preflight.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L207) |
