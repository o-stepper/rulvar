[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectsTelemetry

# Interface: EffectsTelemetry

Defined in: [packages/effects/src/telemetry.ts:12](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L12)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cancelledbeforedispatch"></a> `cancelledBeforeDispatch` | `number` | - | [packages/effects/src/telemetry.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L20) |
| <a id="property-compensated"></a> `compensated` | `number` | - | [packages/effects/src/telemetry.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L18) |
| <a id="property-confirmed"></a> `confirmed` | `number` | - | [packages/effects/src/telemetry.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L17) |
| <a id="property-duplicatereceiptsbenign"></a> `duplicateReceiptsBenign` | `number` | - | [packages/effects/src/telemetry.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L24) |
| <a id="property-duplicatereceiptsconflicting"></a> `duplicateReceiptsConflicting` | `number` | - | [packages/effects/src/telemetry.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L25) |
| <a id="property-incidentsopen"></a> `incidentsOpen` | `number` | Incidents with no disposition citing them. | [packages/effects/src/telemetry.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L27) |
| <a id="property-oldestopenintentagems"></a> `oldestOpenIntentAgeMs?` | `number` | Present only when `nowMs` was supplied. | [packages/effects/src/telemetry.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L16) |
| <a id="property-openeffectintents"></a> `openEffectIntents` | `number` | Consumed intents that have not reached a terminal. | [packages/effects/src/telemetry.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L14) |
| <a id="property-quarantined"></a> `quarantined` | `number` | - | [packages/effects/src/telemetry.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L21) |
| <a id="property-refused"></a> `refused` | `number` | - | [packages/effects/src/telemetry.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L19) |
| <a id="property-unknownentered"></a> `unknownEntered` | `number` | Machines that entered `unknown` at least once. | [packages/effects/src/telemetry.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/telemetry.ts#L23) |
