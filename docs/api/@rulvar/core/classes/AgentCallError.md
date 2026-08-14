[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentCallError

# Class: AgentCallError

Defined in: [packages/core/src/engine/ctx.ts:380](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L380)

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

Defined in: [packages/core/src/engine/ctx.ts:389](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L389)

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
| <a id="property-entryref"></a> `entryRef?` | `readonly` | `number` | [packages/core/src/engine/ctx.ts:387](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L387) |
| <a id="property-issues"></a> `issues?` | `readonly` | [`Issue`](/api/@rulvar/core/type-aliases/Issue.md)[] | [packages/core/src/engine/ctx.ts:384](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L384) |
| <a id="property-kind"></a> `kind` | `readonly` | \| `"transport"` \| `"rate-limit"` \| `"schema-mismatch"` \| `"tool"` \| `"budget"` \| `"terminal"` | [packages/core/src/engine/ctx.ts:381](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L381) |
| <a id="property-result"></a> `result` | `readonly` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | [packages/core/src/engine/ctx.ts:385](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L385) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | [packages/core/src/engine/ctx.ts:382](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L382) |
| <a id="property-retryafterms"></a> `retryAfterMs?` | `readonly` | `number` | [packages/core/src/engine/ctx.ts:383](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L383) |
| <a id="property-scope"></a> `scope` | `readonly` | `string` | [packages/core/src/engine/ctx.ts:386](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L386) |
