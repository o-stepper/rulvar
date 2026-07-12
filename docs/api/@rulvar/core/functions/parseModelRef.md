[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / parseModelRef

# Function: parseModelRef()

```ts
function parseModelRef(ref): {
  adapterId: string;
  model: string;
};
```

Defined in: [packages/core/src/model/router.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L49)

ModelRef is strictly 'adapterId:model', no query parameters. The wire
model id may itself contain colons (for example ollama tags), so only
the FIRST colon splits.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `` `${string}:${string}` `` |

## Returns

```ts
{
  adapterId: string;
  model: string;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `adapterId` | `string` | [packages/core/src/model/router.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L49) |
| `model` | `string` | [packages/core/src/model/router.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L49) |
