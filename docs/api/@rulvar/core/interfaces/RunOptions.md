[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunOptions

# Interface: RunOptions

Defined in: [packages/core/src/engine/engine.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L189)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Run ceiling B0; immutable after start. | [packages/core/src/engine/engine.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L193) |
| <a id="property-deadlineat"></a> `deadlineAt?` | `string` | Run-level deadline (ISO 8601); crossing cancels the run. | [packages/core/src/engine/engine.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L197) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | Run-level defaults merged over engine defaults. | [packages/core/src/engine/engine.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L195) |
| <a id="property-name"></a> `name?` | `string` | - | [packages/core/src/engine/engine.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L198) |
| <a id="property-runid"></a> `runId?` | `string` | Explicit id; otherwise the engine mints a ULID. | [packages/core/src/engine/engine.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L191) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Host-initiated cancellation. | [packages/core/src/engine/engine.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L201) |
| <a id="property-tags"></a> `tags?` | `string`[] | - | [packages/core/src/engine/engine.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L199) |
