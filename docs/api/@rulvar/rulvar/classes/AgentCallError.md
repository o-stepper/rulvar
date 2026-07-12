[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AgentCallError

# Class: AgentCallError

Defined in: `packages/core/dist/index.d.ts`

The rejection carrier of ctx.agent value-form calls: a real Error that
structurally satisfies the typed AgentError and carries the full
AgentResult for Settled mapping. Deliberately not a RulvarError:
AgentError is not in the closed code registry.

## Extends

- `Error`

## Implements

- [`AgentError`](/api/@rulvar/rulvar/type-aliases/AgentError.md)

## Constructors

### Constructor

```ts
new AgentCallError(
   message, 
   result, 
   scope, 
   entryRef?): AgentCallError;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `result` | [`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;`unknown`\&gt; |
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
| <a id="property-entryref"></a> `entryRef?` | `readonly` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-issues"></a> `issues?` | `readonly` | [`Issue`](/api/@rulvar/rulvar/type-aliases/Issue.md)[] | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `readonly` | \| `"budget"` \| `"transport"` \| `"rate-limit"` \| `"schema-mismatch"` \| `"tool"` \| `"terminal"` | `packages/core/dist/index.d.ts` |
| <a id="property-result"></a> `result` | `readonly` | [`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;`unknown`\&gt; | `packages/core/dist/index.d.ts` |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | `packages/core/dist/index.d.ts` |
| <a id="property-retryafterms"></a> `retryAfterMs?` | `readonly` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope` | `readonly` | `string` | `packages/core/dist/index.d.ts` |
