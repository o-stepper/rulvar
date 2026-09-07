[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmitRunUnitInput

# Interface: AdmitRunUnitInput

Defined in: [packages/core/src/admission/engine-bracket.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L97)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-generation"></a> `generation` | `string` | - | [packages/core/src/admission/engine-bracket.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L99) |
| <a id="property-requestcancel"></a> `requestCancel?` | (`reason`) => `void` | The run's cancel request (RV4910): under `onLeaseLost: 'cancel'` a lost lease calls it with the reason, and the caller's own cancellation machinery settles the run; absent, the cancel arm announces and cannot abort. | [packages/core/src/admission/engine-bracket.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L121) |
| <a id="property-resolvedtenant"></a> `resolvedTenant?` | `string` | - | [packages/core/src/admission/engine-bracket.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L101) |
| <a id="property-scope"></a> `scope?` | [`AdmissionScopeDimensions`](/api/@rulvar/core/interfaces/AdmissionScopeDimensions.md) | - | [packages/core/src/admission/engine-bracket.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L100) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | The run's cancel signal (RV4804): host abort and the run deadline both ride it (requestCancel), so an abort while queued ends the wait instead of polling a dead run's ticket forever. | [packages/core/src/admission/engine-bracket.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L108) |
| <a id="property-telemetry"></a> `telemetry?` | \{ `emit`: `void`; \} | The run's event sink (RV4804): renew failures and a lost lease are environmental facts worth announcing; absent, the bracket stays silent exactly as before. | [packages/core/src/admission/engine-bracket.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L114) |
| `telemetry.emit` | `void` | - | [packages/core/src/admission/engine-bracket.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L114) |
| <a id="property-tenantfromscope"></a> `tenantFromScope?` | `boolean` | - | [packages/core/src/admission/engine-bracket.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L102) |
| <a id="property-unitid"></a> `unitId` | `string` | - | [packages/core/src/admission/engine-bracket.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/engine-bracket.ts#L98) |
