[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentCallError

# Class: AgentCallError

Defined in: [packages/core/src/engine/ctx.ts:408](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L408)

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

Defined in: [packages/core/src/engine/ctx.ts:417](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L417)

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
| <a id="property-entryref"></a> `entryRef?` | `readonly` | `number` | [packages/core/src/engine/ctx.ts:415](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L415) |
| <a id="property-issues"></a> `issues?` | `readonly` | [`Issue`](/api/@rulvar/core/type-aliases/Issue.md)[] | [packages/core/src/engine/ctx.ts:412](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L412) |
| <a id="property-kind"></a> `kind` | `readonly` | \| `"transport"` \| `"rate-limit"` \| `"schema-mismatch"` \| `"tool"` \| `"budget"` \| `"terminal"` | [packages/core/src/engine/ctx.ts:409](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L409) |
| <a id="property-result"></a> `result` | `readonly` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | [packages/core/src/engine/ctx.ts:413](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L413) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | [packages/core/src/engine/ctx.ts:410](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L410) |
| <a id="property-retryafterms"></a> `retryAfterMs?` | `readonly` | `number` | [packages/core/src/engine/ctx.ts:411](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L411) |
| <a id="property-scope"></a> `scope` | `readonly` | `string` | [packages/core/src/engine/ctx.ts:414](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L414) |
