[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ApprovalDecision

# Interface: ApprovalDecision

Defined in: [packages/core/src/engine/external.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L69)

The resolution value shape of a tool-approval suspension (M3-T03).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-decision"></a> `decision` | `"allow"` \| `"deny"` | - | [packages/core/src/engine/external.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L70) |
| <a id="property-entryref"></a> `entryRef?` | `number` | The approval suspension's entry seq (RV4008): the address the consumption recheck reads revocations against. Present on every decision this registry hands out; absent only through older callers of toApprovalDecision. | [packages/core/src/engine/external.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L85) |
| <a id="property-expiresat"></a> `expiresAt?` | `string` | The allow's declared expiry (RV4008), carried verbatim from the resolution value: the consumption recheck denies a granted allow whose expiry has passed, exactly like a revocation. Pending approvals already had `deadlineAt`; this bounds the GRANT. | [packages/core/src/engine/external.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L78) |
| <a id="property-reason"></a> `reason?` | `string` | - | [packages/core/src/engine/external.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L71) |
