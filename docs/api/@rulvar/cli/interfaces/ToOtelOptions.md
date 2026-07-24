[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / ToOtelOptions

# Interface: ToOtelOptions

Defined in: [packages/cli/src/otel.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L52)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-contextapi"></a> `contextApi?` | [`OtelContextApi`](/api/@rulvar/cli/interfaces/OtelContextApi.md) | OTel context API for parentage; when absent, spans are flat but attributed. | [packages/cli/src/otel.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L54) |
| <a id="property-patterns"></a> `patterns?` | readonly (`string` \| `RegExp`)[] | Host redaction patterns applied to every exported string attribute ON TOP of the default credential set (RV-217). Feed the same list as `createEngine redaction.patterns` for event/trace parity; an invalid pattern is a typed ConfigError before anything exports. | [packages/cli/src/otel.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L63) |
| <a id="property-setspan"></a> `setSpan?` | (`context`, `span`) => `unknown` | trace.setSpan(context, span) equivalent; required with contextApi. | [packages/cli/src/otel.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L56) |
