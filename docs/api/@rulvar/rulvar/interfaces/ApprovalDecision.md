[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ApprovalDecision

# Interface: ApprovalDecision

Defined in: `packages/core/dist/index.d.ts`

The resolution value shape of a tool-approval suspension (M3-T03).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-decision"></a> `decision` | `"allow"` \| `"deny"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-entryref"></a> `entryRef?` | `number` | The approval suspension's entry seq (RV4008): the address the consumption recheck reads revocations against. Present on every decision this registry hands out; absent only through older callers of toApprovalDecision. | `packages/core/dist/index.d.ts` |
| <a id="property-expiresat"></a> `expiresAt?` | `string` | The allow's declared expiry (RV4008), carried verbatim from the resolution value: the consumption recheck denies a granted allow whose expiry has passed, exactly like a revocation. Pending approvals already had `deadlineAt`; this bounds the GRANT. | `packages/core/dist/index.d.ts` |
| <a id="property-reason"></a> `reason?` | `string` | - | `packages/core/dist/index.d.ts` |
