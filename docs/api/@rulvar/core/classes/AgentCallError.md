[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentCallError

# Class: AgentCallError

Defined in: [packages/core/src/engine/ctx.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L296)

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

Defined in: [packages/core/src/engine/ctx.ts:305](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L305)

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
| <a id="property-entryref"></a> `entryRef?` | `readonly` | `number` | [packages/core/src/engine/ctx.ts:303](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L303) |
| <a id="property-issues"></a> `issues?` | `readonly` | [`Issue`](/api/@rulvar/core/type-aliases/Issue.md)[] | [packages/core/src/engine/ctx.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L300) |
| <a id="property-kind"></a> `kind` | `readonly` | \| `"transport"` \| `"rate-limit"` \| `"schema-mismatch"` \| `"tool"` \| `"budget"` \| `"terminal"` | [packages/core/src/engine/ctx.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L297) |
| <a id="property-result"></a> `result` | `readonly` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | [packages/core/src/engine/ctx.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L301) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | [packages/core/src/engine/ctx.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L298) |
| <a id="property-retryafterms"></a> `retryAfterMs?` | `readonly` | `number` | [packages/core/src/engine/ctx.ts:299](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L299) |
| <a id="property-scope"></a> `scope` | `readonly` | `string` | [packages/core/src/engine/ctx.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L302) |
