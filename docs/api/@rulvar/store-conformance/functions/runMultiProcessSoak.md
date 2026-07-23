[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / runMultiProcessSoak

# Function: runMultiProcessSoak()

```ts
function runMultiProcessSoak(options): Promise<MultiProcessSoakResult>;
```

Defined in: [packages/store-conformance/src/multi-process-soak.ts:883](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L883)

Spawns the writer processes, stops the storm at quorum (or at the
hard cap), verifies the serial history against the store, and throws
one Error naming every violation. The returned result is the storm's
observed coverage; assert on it if the caller wants a floor beyond
the quorum.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`MultiProcessSoakOptions`](/api/@rulvar/store-conformance/interfaces/MultiProcessSoakOptions.md) |

## Returns

`Promise`\&lt;[`MultiProcessSoakResult`](/api/@rulvar/store-conformance/interfaces/MultiProcessSoakResult.md)\&gt;
