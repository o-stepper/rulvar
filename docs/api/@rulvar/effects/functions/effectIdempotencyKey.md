[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / effectIdempotencyKey

# Function: effectIdempotencyKey()

```ts
function effectIdempotencyKey(intent): string;
```

Defined in: [packages/effects/src/adapter.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L108)

The stable idempotency key: the logical key bound to its epoch.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `intent` | [`EffectMachine`](/api/@rulvar/rulvar/interfaces/EffectMachine.md) |

## Returns

`string`
