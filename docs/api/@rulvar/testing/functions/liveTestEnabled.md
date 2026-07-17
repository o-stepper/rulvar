[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / liveTestEnabled

# Function: liveTestEnabled()

```ts
function liveTestEnabled(...requiredEnvKeys): boolean;
```

Defined in: [packages/testing/src/live.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L32)

True only when `RULVAR_LIVE_TESTS` is exactly `'1'` AND every named
environment key is set to a non-empty value. Gate live tests as
`it.skipIf(!liveTestEnabled('ANTHROPIC_API_KEY'))(...)` so an
unrelated key in the shell never triggers a paid provider call from
an ordinary test run.

## Parameters

| Parameter | Type |
| ------ | ------ |
| ...`requiredEnvKeys` | `string`[] |

## Returns

`boolean`
