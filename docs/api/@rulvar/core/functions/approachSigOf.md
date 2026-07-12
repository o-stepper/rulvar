[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / approachSigOf

# Function: approachSigOf()

```ts
function approachSigOf(coarse, tag?): string;
```

Defined in: [packages/core/src/journal/lineage.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L209)

approachSig = sha256(JCS({ sigVersion, coarse, approachTag })); keys lessons.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `coarse` | `string` |
| `tag?` | `string` |

## Returns

`string`
