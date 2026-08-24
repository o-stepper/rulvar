[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FairQueueState

# Interface: FairQueueState

Defined in: [packages/core/src/admission/algorithms.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L26)

Persistent per-queue SFQ state.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-finishtags"></a> `finishTags` | `Record`\&lt;`string`, `number`\&gt; | memberKey -> the member's last finish tag. | [packages/core/src/admission/algorithms.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L29) |
| <a id="property-virtualtime"></a> `virtualTime` | `number` | - | [packages/core/src/admission/algorithms.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L27) |
