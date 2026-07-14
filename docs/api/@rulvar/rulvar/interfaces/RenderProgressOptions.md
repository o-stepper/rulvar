[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RenderProgressOptions

# Interface: RenderProgressOptions

Defined in: [packages/rulvar/src/render-progress.ts:11](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/render-progress.ts#L11)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-logs"></a> `logs?` | `boolean` | Include log events (default true; debug level is always skipped). | [packages/rulvar/src/render-progress.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/render-progress.ts#L15) |
| <a id="property-write"></a> `write?` | (`line`) => `void` | Line sink; defaults to process.stderr. | [packages/rulvar/src/render-progress.ts:13](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/render-progress.ts#L13) |
