[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ApprovalRevocationOutcome

# Interface: ApprovalRevocationOutcome

Defined in: `packages/core/dist/index.d.ts`

One recorded approval revocation's outcome (RV4008).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-entryref"></a> `entryRef` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-state"></a> `state` | \| `"denied-pending"` \| `"revoked-allow"` \| `"already-revoked"` \| `"already-closed"` | 'denied-pending': the approval was still open and is now denied through the ordinary first-closing-wins arbitration. 'revoked-allow': a recorded allow now carries a journaled revocation that beats it at the consumption recheck. 'already-revoked': a prior revocation already stands. 'already-closed': the approval was denied or abandoned; there is nothing to revoke. | `packages/core/dist/index.d.ts` |
