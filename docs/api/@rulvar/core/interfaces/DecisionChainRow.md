[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DecisionChainRow

# Interface: DecisionChainRow

Defined in: [packages/core/src/l0/decision-chain.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L39)

One authority record of the chain, seq-ordered.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-authorizedby"></a> `authorizedBy?` | `number` | Present on abandons: the seq of the sanctioning entry. | [packages/core/src/l0/decision-chain.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L52) |
| <a id="property-by"></a> `by?` | [`ResolutionBy`](/api/@rulvar/core/type-aliases/ResolutionBy.md) | Present on resolutions: who resolved. | [packages/core/src/l0/decision-chain.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L48) |
| <a id="property-decisionref"></a> `decisionRef?` | `number` | Present on class-decision resolutions: the class decision's seq. | [packages/core/src/l0/decision-chain.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L54) |
| <a id="property-decisiontype"></a> `decisionType?` | `string` | Present when the journaled value names its decision type. | [packages/core/src/l0/decision-chain.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L46) |
| <a id="property-key"></a> `key` | `string` | - | [packages/core/src/l0/decision-chain.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L43) |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/core/type-aliases/EntryKind.md) | - | [packages/core/src/l0/decision-chain.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L41) |
| <a id="property-scope"></a> `scope` | `string` | - | [packages/core/src/l0/decision-chain.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L42) |
| <a id="property-seq"></a> `seq` | `number` | - | [packages/core/src/l0/decision-chain.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L40) |
| <a id="property-status"></a> `status` | [`EntryStatus`](/api/@rulvar/core/type-aliases/EntryStatus.md) | - | [packages/core/src/l0/decision-chain.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L44) |
| <a id="property-target"></a> `target?` | `number` | Present on resolutions and abandons: the referenced seq. | [packages/core/src/l0/decision-chain.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L50) |
| <a id="property-value"></a> `value?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | The journaled value verbatim, when the entry carries one. | [packages/core/src/l0/decision-chain.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L56) |
