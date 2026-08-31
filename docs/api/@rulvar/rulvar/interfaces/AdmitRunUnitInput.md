[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmitRunUnitInput

# Interface: AdmitRunUnitInput

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-generation"></a> `generation` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-resolvedtenant"></a> `resolvedTenant?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope?` | [`AdmissionScopeDimensions`](/api/@rulvar/rulvar/interfaces/AdmissionScopeDimensions.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | The run's cancel signal (RV4804): host abort and the run deadline both ride it (requestCancel), so an abort while queued ends the wait instead of polling a dead run's ticket forever. | `packages/core/dist/index.d.ts` |
| <a id="property-telemetry"></a> `telemetry?` | \{ `emit`: `void`; \} | The run's event sink (RV4804): renew failures and a lost lease are environmental facts worth announcing; absent, the bracket stays silent exactly as before. | `packages/core/dist/index.d.ts` |
| `telemetry.emit` | `void` | - | `packages/core/dist/index.d.ts` |
| <a id="property-tenantfromscope"></a> `tenantFromScope?` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-unitid"></a> `unitId` | `string` | - | `packages/core/dist/index.d.ts` |
