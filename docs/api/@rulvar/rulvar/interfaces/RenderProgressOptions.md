[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RenderProgressOptions

# Interface: RenderProgressOptions

Defined in: [packages/rulvar/src/render-progress.ts:12](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/render-progress.ts#L12)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-logs"></a> `logs?` | `boolean` | Include log events (default true; debug level is always skipped). | [packages/rulvar/src/render-progress.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/render-progress.ts#L16) |
| <a id="property-write"></a> `write?` | (`line`) => `void` | Line sink; defaults to process.stderr. | [packages/rulvar/src/render-progress.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/render-progress.ts#L14) |
