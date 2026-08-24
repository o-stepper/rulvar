[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ApprovalExpiredDecision

# Interface: ApprovalExpiredDecision

Defined in: `packages/core/dist/index.d.ts`

The clock fact for grant expiry (RFC section 4.5, item 1): the fold
never compares wall clocks, so an approval's `expiresAt` becomes
effective only through this appended decision. Mirrors the shipped
`approval_revoked` decision shape (targetRef addressing, no opId:
idempotent by content, appendable by any observer with append
rights, because it only materializes a crossing the approval's own
recorded expiry already determines).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-decisiontype"></a> `decisionType` | `"approval_expired"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-expiresat"></a> `expiresAt` | `string` | The recorded expiry instant this decision materializes. | `packages/core/dist/index.d.ts` |
| <a id="property-observer"></a> `observer?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-targetref"></a> `targetRef` | `number` | - | `packages/core/dist/index.d.ts` |
