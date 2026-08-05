[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DecisionChainRow

# Interface: DecisionChainRow

Defined in: `packages/core/dist/index.d.ts`

One authority record of the chain, seq-ordered.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-authorizedby"></a> `authorizedBy?` | `number` | Present on abandons: the seq of the sanctioning entry (canonical `entry.abandon`). | `packages/core/dist/index.d.ts` |
| <a id="property-by"></a> `by?` | [`ResolutionBy`](/api/@rulvar/rulvar/type-aliases/ResolutionBy.md) | Present on resolutions: who resolved (canonical `entry.resolution.by` first). | `packages/core/dist/index.d.ts` |
| <a id="property-decisionref"></a> `decisionRef?` | `number` | Present on class-decision resolutions: the class decision's seq. | `packages/core/dist/index.d.ts` |
| <a id="property-decisiontype"></a> `decisionType?` | `string` | Present when the journaled value names its decision type. | `packages/core/dist/index.d.ts` |
| <a id="property-key"></a> `key` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/rulvar/type-aliases/EntryKind.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-seq"></a> `seq` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | [`EntryStatus`](/api/@rulvar/rulvar/type-aliases/EntryStatus.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-target"></a> `target?` | `number` | Present on resolutions and abandons: the referenced seq. | `packages/core/dist/index.d.ts` |
| <a id="property-value"></a> `value?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | The journaled value verbatim when the entry carries one; on a canonical resolution with no entry value, the resolution's own decision value (what the ask was resolved WITH). | `packages/core/dist/index.d.ts` |
