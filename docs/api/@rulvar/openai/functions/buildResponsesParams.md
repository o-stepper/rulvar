[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / buildResponsesParams

# Function: buildResponsesParams()

```ts
function buildResponsesParams(req, ids): {
  effortDownmapped: boolean;
  params: Record<string, unknown>;
};
```

Defined in: [packages/openai/src/wire.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L79)

Builds Responses API params. Manual item replay ONLY: store: false plus
include reasoning.encrypted_content; previous_response_id and the
Conversations API place state server-side, break replay identity, and
are REJECTED as a typed ConfigError. Role
'system' messages project into top-level instructions on every request.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |
| `ids` | [`OpenAiIdMap`](/api/@rulvar/openai/classes/OpenAiIdMap.md) |

## Returns

```ts
{
  effortDownmapped: boolean;
  params: Record<string, unknown>;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `effortDownmapped` | `boolean` | [packages/openai/src/wire.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L82) |
| `params` | `Record`\&lt;`string`, `unknown`\&gt; | [packages/openai/src/wire.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L82) |
