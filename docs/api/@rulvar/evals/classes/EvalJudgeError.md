[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / EvalJudgeError

# Class: EvalJudgeError

Defined in: [packages/evals/src/case.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L121)

Thrown when a judge run does not settle ok.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new EvalJudgeError(
   judgeRun, 
   status, 
   detail?): EvalJudgeError;
```

Defined in: [packages/evals/src/case.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L124)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `judgeRun` | `string` |
| `status` | `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` |
| `detail?` | `string` |

#### Returns

`EvalJudgeError`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-judgerun"></a> `judgeRun` | `readonly` | `string` | [packages/evals/src/case.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L122) |
| <a id="property-status"></a> `status` | `readonly` | `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` | [packages/evals/src/case.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L123) |
