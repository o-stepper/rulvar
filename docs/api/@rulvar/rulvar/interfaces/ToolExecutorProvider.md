[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolExecutorProvider

# Interface: ToolExecutorProvider

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

The construction-side posture attestation (RV4204): a PURE
snapshot of what the executor chose at construction (ledger,
env allowlist, ceilings, isolation seam), read by
`compileRegulatedProfile` and folded into the hashed posture map;
see the `regulated-posture` module.

#### Returns

[`RegulatedPostureDescriptor`](/api/@rulvar/rulvar/type-aliases/RegulatedPostureDescriptor.md)

***

### run()

```ts
run(request): Promise<Json>;
```

Defined in: `packages/core/dist/index.d.ts`

Runs one dispatch to its JSON result; throws to signal tool failure.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`IsolatedExecRequest`](/api/@rulvar/rulvar/interfaces/IsolatedExecRequest.md) |

#### Returns

`Promise`\&lt;[`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)\&gt;
