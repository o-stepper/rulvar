[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / hashRunArgs

# Function: hashRunArgs()

```ts
function hashRunArgs(args): string | undefined;
```

Defined in: [packages/core/src/engine/engine.ts:319](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L319)

sha256 hex over the JCS canonical serialization of a run's args: the
value the engine records as `RunMeta.argsHash` at genesis, exposed so
hosts can verify re-supplied resume args against the recorded hash
(the v1.23.0 review: a resume that silently drops or changes args
changes the logical run and pays again). Returns undefined for
undefined args (a run started without args records none). Throws when
JCS cannot serialize the value (functions, cycles, non-finite
numbers); the engine then records `argsProvided` without a hash.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `args` | `unknown` |

## Returns

`string` \| `undefined`
