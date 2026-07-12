[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / createCanonicalIdMinter

# Function: createCanonicalIdMinter()

```ts
function createCanonicalIdMinter(options?): () => string;
```

Defined in: [packages/core/src/l0/messages.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L27)

Returns a per-engine minter of CanonicalId values. Monotonic within the
factory instance; never a module-level singleton (docs/02, section
"Dependency rules": no module state).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | \{ `now?`: () => `number`; `random?`: (`byteLength`) => `Uint8Array`; \} |
| `options.now?` | () => `number` |
| `options.random?` | (`byteLength`) => `Uint8Array` |

## Returns

() => `string`
