[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / createCanonicalIdMinter

# Function: createCanonicalIdMinter()

```ts
function createCanonicalIdMinter(options?): () => string;
```

Defined in: `packages/core/dist/index.d.ts`

Returns a per-engine minter of CanonicalId values. Monotonic within the
factory instance; never a module-level singleton (no module state).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | \{ `now?`: () => `number`; `random?`: (`byteLength`) => `Uint8Array`; \} |
| `options.now?` | () => `number` |
| `options.random?` | (`byteLength`) => `Uint8Array` |

## Returns

() => `string`
