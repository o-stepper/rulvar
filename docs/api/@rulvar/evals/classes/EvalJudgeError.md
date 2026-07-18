[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / EvalJudgeError

# Class: EvalJudgeError

Defined in: [packages/evals/src/case.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L135)

Thrown when a judge run does not settle ok.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new EvalJudgeError(
   judgeRun, 
   status, 
   detail?, 
   costUsd?): EvalJudgeError;
```

Defined in: [packages/evals/src/case.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L140)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `judgeRun` | `string` | `undefined` |
| `status` | `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` | `undefined` |
| `detail?` | `string` | `undefined` |
| `costUsd?` | `number` | `0` |

#### Returns

`EvalJudgeError`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-costusd"></a> `costUsd` | `readonly` | `number` | What the failing judge run actually spent (honest cost accounting). | [packages/evals/src/case.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L139) |
| <a id="property-judgerun"></a> `judgeRun` | `readonly` | `string` | - | [packages/evals/src/case.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L136) |
| <a id="property-status"></a> `status` | `readonly` | `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` | - | [packages/evals/src/case.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L137) |
