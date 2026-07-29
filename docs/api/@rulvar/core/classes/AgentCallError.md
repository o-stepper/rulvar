[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentCallError

# Class: AgentCallError

Defined in: [packages/core/src/engine/ctx.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L318)

The rejection carrier of ctx.agent value-form calls: a real Error that
structurally satisfies the typed AgentError and carries the full
AgentResult for Settled mapping. Deliberately not a RulvarError:
AgentError is not in the closed code registry.

## Extends

- `Error`

## Implements

- [`AgentError`](/api/@rulvar/core/type-aliases/AgentError.md)

## Constructors

### Constructor

```ts
new AgentCallError(
   message, 
   result, 
   scope, 
   entryRef?): AgentCallError;
```

Defined in: [packages/core/src/engine/ctx.ts:327](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L327)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `result` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; |
| `scope` | `string` |
| `entryRef?` | `number` |

#### Returns

`AgentCallError`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-entryref"></a> `entryRef?` | `readonly` | `number` | [packages/core/src/engine/ctx.ts:325](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L325) |
| <a id="property-issues"></a> `issues?` | `readonly` | [`Issue`](/api/@rulvar/core/type-aliases/Issue.md)[] | [packages/core/src/engine/ctx.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L322) |
| <a id="property-kind"></a> `kind` | `readonly` | \| `"transport"` \| `"rate-limit"` \| `"schema-mismatch"` \| `"tool"` \| `"budget"` \| `"terminal"` | [packages/core/src/engine/ctx.ts:319](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L319) |
| <a id="property-result"></a> `result` | `readonly` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | [packages/core/src/engine/ctx.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L323) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | [packages/core/src/engine/ctx.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L320) |
| <a id="property-retryafterms"></a> `retryAfterMs?` | `readonly` | `number` | [packages/core/src/engine/ctx.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L321) |
| <a id="property-scope"></a> `scope` | `readonly` | `string` | [packages/core/src/engine/ctx.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L324) |
