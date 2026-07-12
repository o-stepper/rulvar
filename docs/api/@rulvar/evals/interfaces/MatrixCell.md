[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / MatrixCell

# Interface: MatrixCell

Defined in: [packages/evals/src/matrix.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/matrix.ts#L18)

One configuration under comparison.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engine"></a> `engine` | () => \| [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) \| `Promise`\&lt;[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md)\&gt; | A fresh engine per cell run keeps cells isolated. | [packages/evals/src/matrix.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/matrix.ts#L21) |
| <a id="property-name"></a> `name` | `string` | - | [packages/evals/src/matrix.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/matrix.ts#L19) |
