[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / parseModelRef

# Function: parseModelRef()

```ts
function parseModelRef(ref): {
  adapterId: string;
  model: string;
};
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

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
| `adapterId` | `string` | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `model` | `string` | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
