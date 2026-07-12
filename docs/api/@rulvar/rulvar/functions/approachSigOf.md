[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / approachSigOf

# Function: approachSigOf()

```ts
function approachSigOf(coarse, tag?): string;
```

Defined in: `packages/core/dist/index.d.ts`

approachSig = sha256(JCS({ sigVersion, coarse, approachTag })); keys lessons.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `coarse` | `string` |
| `tag?` | `string` |

## Returns

`string`
