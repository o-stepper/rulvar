[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PhaseRow

# Interface: PhaseRow

Defined in: [packages/core/src/l0/telemetry-reduce.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L36)

One phase activation of one agent span.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-costusd"></a> `costUsd` | `number` | - | [packages/core/src/l0/telemetry-reduce.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L43) |
| <a id="property-durationms"></a> `durationMs` | `number` | 0 until the end event arrives, and on replayed rows. | [packages/core/src/l0/telemetry-reduce.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L41) |
| <a id="property-invocation"></a> `invocation` | `number` | - | [packages/core/src/l0/telemetry-reduce.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L37) |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/l0/telemetry-reduce.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L39) |
| <a id="property-open"></a> `open` | `boolean` | True when the phase's end event never arrived. | [packages/core/src/l0/telemetry-reduce.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L48) |
| <a id="property-outcome"></a> `outcome?` | `"error"` \| `"ok"` | - | [packages/core/src/l0/telemetry-reduce.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L44) |
| <a id="property-replayed"></a> `replayed` | `boolean` | - | [packages/core/src/l0/telemetry-reduce.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L46) |
| <a id="property-retries"></a> `retries` | `number` | - | [packages/core/src/l0/telemetry-reduce.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L45) |
| <a id="property-role"></a> `role` | `string` | - | [packages/core/src/l0/telemetry-reduce.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L38) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/telemetry-reduce.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L42) |
