[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmitRunUnitInput

# Interface: AdmitRunUnitInput

Defined in: [packages/core/src/admission/engine-bracket.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L73)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-generation"></a> `generation` | `string` | - | [packages/core/src/admission/engine-bracket.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L75) |
| <a id="property-resolvedtenant"></a> `resolvedTenant?` | `string` | - | [packages/core/src/admission/engine-bracket.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L77) |
| <a id="property-scope"></a> `scope?` | [`AdmissionScopeDimensions`](/api/@rulvar/core/interfaces/AdmissionScopeDimensions.md) | - | [packages/core/src/admission/engine-bracket.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L76) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | The run's cancel signal (RV4804): host abort and the run deadline both ride it (requestCancel), so an abort while queued ends the wait instead of polling a dead run's ticket forever. | [packages/core/src/admission/engine-bracket.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L84) |
| <a id="property-telemetry"></a> `telemetry?` | \{ `emit`: `void`; \} | The run's event sink (RV4804): renew failures and a lost lease are environmental facts worth announcing; absent, the bracket stays silent exactly as before. | [packages/core/src/admission/engine-bracket.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L90) |
| `telemetry.emit` | `void` | - | [packages/core/src/admission/engine-bracket.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L90) |
| <a id="property-tenantfromscope"></a> `tenantFromScope?` | `boolean` | - | [packages/core/src/admission/engine-bracket.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L78) |
| <a id="property-unitid"></a> `unitId` | `string` | - | [packages/core/src/admission/engine-bracket.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L74) |
