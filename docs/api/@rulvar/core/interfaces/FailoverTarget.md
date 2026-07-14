[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FailoverTarget

# Interface: FailoverTarget

Defined in: [packages/core/src/model/failover.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/failover.ts#L23)

One resolved failover target (rich form).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `` `${string}:${string}` `` | - | [packages/core/src/model/failover.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/failover.ts#L24) |
| <a id="property-on"></a> `on?` | [`FailoverTrigger`](/api/@rulvar/core/type-aliases/FailoverTrigger.md)[] | Triggers this target serves; absent = both. | [packages/core/src/model/failover.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/failover.ts#L26) |
