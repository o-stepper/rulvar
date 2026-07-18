[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / buildResponsesParams

# Function: buildResponsesParams()

```ts
function buildResponsesParams(
   req, 
   ids, 
   options?): {
  effortDownmapped: boolean;
  params: Record<string, unknown>;
};
```

Defined in: [packages/openai/src/wire.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L83)

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
| `options?` | \{ `wireMaxEffort?`: `boolean`; \} |
| `options.wireMaxEffort?` | `boolean` |

## Returns

```ts
{
  effortDownmapped: boolean;
  params: Record<string, unknown>;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `effortDownmapped` | `boolean` | [packages/openai/src/wire.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L87) |
| `params` | `Record`\&lt;`string`, `unknown`\&gt; | [packages/openai/src/wire.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L87) |
