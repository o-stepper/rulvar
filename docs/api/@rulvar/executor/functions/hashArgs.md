[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / hashArgs

# Function: hashArgs()

```ts
function hashArgs(args): string;
```

Defined in: [packages/executor/src/spi.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L151)

A stable content hash of the arguments for the ledger's `argsHash`. It
canonicalizes object key order so equal arguments hash equally
regardless of property order.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `args` | `unknown` |

## Returns

`string`
