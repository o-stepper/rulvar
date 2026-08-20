[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolExecutorProvider

# Interface: ToolExecutorProvider

Defined in: [packages/core/src/l0/spi/executor.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L80)

The isolated tool executor seam. A provider runs one dispatch to its
JSON result. A thrown error becomes the call's error tool result, never
a run abort: an executor failure (non-zero exit, timeout kill,
unparseable output, infrastructure error) is surfaced to the model
exactly like any other tool error, so the loop can react and the run
stays durable.

## Methods

### describeRegulatedPosture()?

```ts
optional describeRegulatedPosture(): RegulatedPostureDescriptor;
```

Defined in: [packages/core/src/l0/spi/executor.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L90)

The construction-side posture attestation (RV4204): a PURE
snapshot of what the executor chose at construction (ledger,
env allowlist, ceilings, isolation seam), read by
`compileRegulatedProfile` and folded into the hashed posture map;
see the `regulated-posture` module.

#### Returns

[`RegulatedPostureDescriptor`](/api/@rulvar/core/type-aliases/RegulatedPostureDescriptor.md)

***

### run()

```ts
run(request): Promise<Json>;
```

Defined in: [packages/core/src/l0/spi/executor.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L82)

Runs one dispatch to its JSON result; throws to signal tool failure.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`IsolatedExecRequest`](/api/@rulvar/core/interfaces/IsolatedExecRequest.md) |

#### Returns

`Promise`\&lt;[`Json`](/api/@rulvar/core/type-aliases/Json.md)\&gt;
