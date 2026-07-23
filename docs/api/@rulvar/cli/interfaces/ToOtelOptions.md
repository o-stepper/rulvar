[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / ToOtelOptions

# Interface: ToOtelOptions

Defined in: [packages/cli/src/otel.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L46)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-contextapi"></a> `contextApi?` | [`OtelContextApi`](/api/@rulvar/cli/interfaces/OtelContextApi.md) | OTel context API for parentage; when absent, spans are flat but attributed. | [packages/cli/src/otel.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L48) |
| <a id="property-setspan"></a> `setSpan?` | (`context`, `span`) => `unknown` | trace.setSpan(context, span) equivalent; required with contextApi. | [packages/cli/src/otel.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L50) |
