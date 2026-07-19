[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RenderProgressOptions

# Interface: RenderProgressOptions

Defined in: [packages/rulvar/src/render-progress.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/render-progress.ts#L16)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-logs"></a> `logs?` | `boolean` | Include log events (default true; debug level is always skipped). | [packages/rulvar/src/render-progress.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/render-progress.ts#L20) |
| <a id="property-write"></a> `write?` | (`line`) => `void` | Line sink; defaults to process.stderr. | [packages/rulvar/src/render-progress.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/render-progress.ts#L18) |
