[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / cassetteAdapter

# Function: cassetteAdapter()

```ts
function cassetteAdapter(script): ProviderAdapter & {
  calls: ChatRequest[];
};
```

Defined in: [packages/plan/src/cassettes.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L111)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `script` | (`req`) => [`CassetteTurn`](/api/@rulvar/plan/interfaces/CassetteTurn.md) |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md) & \{
  `calls`: [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md)[];
\}
