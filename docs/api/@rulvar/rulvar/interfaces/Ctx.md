[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Ctx

# Interface: Ctx\&lt;P\&gt;

Defined in: `packages/core/dist/index.d.ts`

The canonical Ctx interface, M1 members.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `P` *extends* [`ErrorPolicy`](/api/@rulvar/rulvar/type-aliases/ErrorPolicy.md) | `"strict"` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-budget"></a> `budget` | \{ `remaining`: [`Spend`](/api/@rulvar/rulvar/type-aliases/Spend.md) \| `null`; `spent`: [`Spend`](/api/@rulvar/rulvar/type-aliases/Spend.md); \} | `packages/core/dist/index.d.ts` |
| `budget.remaining` | [`Spend`](/api/@rulvar/rulvar/type-aliases/Spend.md) \| `null` | `packages/core/dist/index.d.ts` |
| `budget.spent` | [`Spend`](/api/@rulvar/rulvar/type-aliases/Spend.md) | `packages/core/dist/index.d.ts` |

## Methods

### agent()

#### Call Signature

```ts
agent(prompt): Promise<P extends "lenient" ? string | null : string>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `prompt` | `string` |

##### Returns

`Promise`\&lt;`P` *extends* `"lenient"` ? `string` \| `null` : `string`\&gt;

#### Call Signature

```ts
agent<S>(prompt, o): Promise<AgentResult<Out<S>>>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt; |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `prompt` | `string` |
| `o` | [`AgentOpts`](/api/@rulvar/rulvar/interfaces/AgentOpts.md)\&lt;`S`\&gt; & \{ `result`: `"full"`; \} |

##### Returns

`Promise`\&lt;[`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;[`Out`](/api/@rulvar/rulvar/type-aliases/Out.md)\&lt;`S`\&gt;\&gt;\&gt;

#### Call Signature

```ts
agent<S>(prompt, o): Promise<Out<S>>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt; |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `prompt` | `string` |
| `o` | [`AgentOpts`](/api/@rulvar/rulvar/interfaces/AgentOpts.md)\&lt;`S`\&gt; & \{ `onError`: `"throw"`; \} |

##### Returns

`Promise`\&lt;[`Out`](/api/@rulvar/rulvar/type-aliases/Out.md)\&lt;`S`\&gt;\&gt;

#### Call Signature

```ts
agent<S>(prompt, o?): Promise<P extends "lenient" ? Out<S> | null : Out<S>>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt; |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `prompt` | `string` |
| `o?` | [`AgentOpts`](/api/@rulvar/rulvar/interfaces/AgentOpts.md)\&lt;`S`\&gt; |

##### Returns

`Promise`\&lt;`P` *extends* `"lenient"` ? [`Out`](/api/@rulvar/rulvar/type-aliases/Out.md)\&lt;`S`\&gt; \| `null` : [`Out`](/api/@rulvar/rulvar/type-aliases/Out.md)\&lt;`S`\&gt;\&gt;

***

### awaitExternal()

```ts
awaitExternal<T>(key, o?): Promise<T>;
```

Defined in: `packages/core/dist/index.d.ts`

Suspends this position on a journaled entry until an external
resolution arrives. NO deadline in v1.

#### Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `o?` | \{ `prompt?`: `string`; `schema?`: [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;; \} |
| `o.prompt?` | `string` |
| `o.schema?` | [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt; |

#### Returns

`Promise`\&lt;`T`\&gt;

***

### brief()

```ts
brief(o): Promise<string>;
```

Defined in: `packages/core/dist/index.d.ts`

A journaled summarize invocation for handing an inheritable brief to
a child (M6-T10): one agent-kind entry under
role 'summarize', therefore free on replay.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `o` | [`BriefOpts`](/api/@rulvar/rulvar/interfaces/BriefOpts.md) |

#### Returns

`Promise`\&lt;`string`\&gt;

***

### log()

```ts
log(
   level, 
   msg, 
   data?): void;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `level` | `"error"` \| `"debug"` \| `"info"` \| `"warn"` |
| `msg` | `string` |
| `data?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

#### Returns

`void`

***

### now()

```ts
now(): number;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

`number`

***

### orchestrate()

```ts
orchestrate(goal, opts?): Promise<unknown>;
```

Defined in: `packages/core/dist/index.d.ts`

Nests a dynamic orchestrator under the AdmissionController (M6-T07):
one implementation with the top-level
orchestrate(engine, goal, opts) surface, clamped by maxDepth and the
parent budget account through the ordinary ctx.workflow admission.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `goal` | `string` |
| `opts?` | [`OrchestrateOptions`](/api/@rulvar/rulvar/interfaces/OrchestrateOptions.md) |

#### Returns

`Promise`\&lt;`unknown`\&gt;

***

### parallel()

#### Call Signature

```ts
parallel<T>(tasks, o?): Promise<T[]>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `T` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `tasks` | () => `Promise`\&lt;`T`\&gt;[] |
| `o?` | \{ `abortSiblings?`: `boolean`; `settle?`: `false`; \} |
| `o.abortSiblings?` | `boolean` |
| `o.settle?` | `false` |

##### Returns

`Promise`\&lt;`T`[]\&gt;

#### Call Signature

```ts
parallel<T>(tasks, o): Promise<Settled<T>[]>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `T` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `tasks` | () => `Promise`\&lt;`T`\&gt;[] |
| `o` | \{ `settle`: `true`; \} |
| `o.settle` | `true` |

##### Returns

`Promise`\&lt;[`Settled`](/api/@rulvar/rulvar/type-aliases/Settled.md)\&lt;`T`\&gt;[]\&gt;

***

### phase()

```ts
phase<T>(name, fn): Promise<T>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `fn` | () => `Promise`\&lt;`T`\&gt; |

#### Returns

`Promise`\&lt;`T`\&gt;

***

### pipeline()

#### Call Signature

```ts
pipeline<I, A>(
   items, 
   s1, 
o): Promise<PipelineCollected<A>>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `o` | [`CollectOpts`](/api/@rulvar/rulvar/interfaces/CollectOpts.md) |

##### Returns

`Promise`\&lt;[`PipelineCollected`](/api/@rulvar/rulvar/interfaces/PipelineCollected.md)\&lt;`A`\&gt;\&gt;

#### Call Signature

```ts
pipeline<I, A>(
   items, 
   s1, 
o?): Promise<A[]>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `o?` | [`PipelineOpts`](/api/@rulvar/rulvar/interfaces/PipelineOpts.md) |

##### Returns

`Promise`\&lt;`A`[]\&gt;

#### Call Signature

```ts
pipeline<I, A, B>(
   items, 
   s1, 
   s2, 
o): Promise<PipelineCollected<B>>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |
| `B` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `s2` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`A`, `B`\&gt; |
| `o` | [`CollectOpts`](/api/@rulvar/rulvar/interfaces/CollectOpts.md) |

##### Returns

`Promise`\&lt;[`PipelineCollected`](/api/@rulvar/rulvar/interfaces/PipelineCollected.md)\&lt;`B`\&gt;\&gt;

#### Call Signature

```ts
pipeline<I, A, B>(
   items, 
   s1, 
   s2, 
o?): Promise<B[]>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |
| `B` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `s2` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`A`, `B`\&gt; |
| `o?` | [`PipelineOpts`](/api/@rulvar/rulvar/interfaces/PipelineOpts.md) |

##### Returns

`Promise`\&lt;`B`[]\&gt;

#### Call Signature

```ts
pipeline<I, A, B, C>(
   items, 
   s1, 
   s2, 
   s3, 
o): Promise<PipelineCollected<C>>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |
| `B` |
| `C` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `s2` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`A`, `B`\&gt; |
| `s3` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`B`, `C`\&gt; |
| `o` | [`CollectOpts`](/api/@rulvar/rulvar/interfaces/CollectOpts.md) |

##### Returns

`Promise`\&lt;[`PipelineCollected`](/api/@rulvar/rulvar/interfaces/PipelineCollected.md)\&lt;`C`\&gt;\&gt;

#### Call Signature

```ts
pipeline<I, A, B, C>(
   items, 
   s1, 
   s2, 
   s3, 
o?): Promise<C[]>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |
| `B` |
| `C` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `s2` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`A`, `B`\&gt; |
| `s3` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`B`, `C`\&gt; |
| `o?` | [`PipelineOpts`](/api/@rulvar/rulvar/interfaces/PipelineOpts.md) |

##### Returns

`Promise`\&lt;`C`[]\&gt;

#### Call Signature

```ts
pipeline<I, A, B, C, D>(
   items, 
   s1, 
   s2, 
   s3, 
   s4, 
o): Promise<PipelineCollected<D>>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |
| `B` |
| `C` |
| `D` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `s2` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`A`, `B`\&gt; |
| `s3` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`B`, `C`\&gt; |
| `s4` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`C`, `D`\&gt; |
| `o` | [`CollectOpts`](/api/@rulvar/rulvar/interfaces/CollectOpts.md) |

##### Returns

`Promise`\&lt;[`PipelineCollected`](/api/@rulvar/rulvar/interfaces/PipelineCollected.md)\&lt;`D`\&gt;\&gt;

#### Call Signature

```ts
pipeline<I, A, B, C, D>(
   items, 
   s1, 
   s2, 
   s3, 
   s4, 
o?): Promise<D[]>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |
| `B` |
| `C` |
| `D` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `s2` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`A`, `B`\&gt; |
| `s3` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`B`, `C`\&gt; |
| `s4` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`C`, `D`\&gt; |
| `o?` | [`PipelineOpts`](/api/@rulvar/rulvar/interfaces/PipelineOpts.md) |

##### Returns

`Promise`\&lt;`D`[]\&gt;

#### Call Signature

```ts
pipeline<I, A, B, C, D, E>(
   items, 
   s1, 
   s2, 
   s3, 
   s4, 
   s5, 
o): Promise<PipelineCollected<E>>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |
| `B` |
| `C` |
| `D` |
| `E` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `s2` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`A`, `B`\&gt; |
| `s3` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`B`, `C`\&gt; |
| `s4` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`C`, `D`\&gt; |
| `s5` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`D`, `E`\&gt; |
| `o` | [`CollectOpts`](/api/@rulvar/rulvar/interfaces/CollectOpts.md) |

##### Returns

`Promise`\&lt;[`PipelineCollected`](/api/@rulvar/rulvar/interfaces/PipelineCollected.md)\&lt;`E`\&gt;\&gt;

#### Call Signature

```ts
pipeline<I, A, B, C, D, E>(
   items, 
   s1, 
   s2, 
   s3, 
   s4, 
   s5, 
o?): Promise<E[]>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |
| `B` |
| `C` |
| `D` |
| `E` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `s2` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`A`, `B`\&gt; |
| `s3` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`B`, `C`\&gt; |
| `s4` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`C`, `D`\&gt; |
| `s5` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`D`, `E`\&gt; |
| `o?` | [`PipelineOpts`](/api/@rulvar/rulvar/interfaces/PipelineOpts.md) |

##### Returns

`Promise`\&lt;`E`[]\&gt;

#### Call Signature

```ts
pipeline<I, A, B, C, D, E, F>(
   items, 
   s1, 
   s2, 
   s3, 
   s4, 
   s5, 
   s6, 
o): Promise<PipelineCollected<F>>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |
| `B` |
| `C` |
| `D` |
| `E` |
| `F` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `s2` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`A`, `B`\&gt; |
| `s3` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`B`, `C`\&gt; |
| `s4` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`C`, `D`\&gt; |
| `s5` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`D`, `E`\&gt; |
| `s6` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`E`, `F`\&gt; |
| `o` | [`CollectOpts`](/api/@rulvar/rulvar/interfaces/CollectOpts.md) |

##### Returns

`Promise`\&lt;[`PipelineCollected`](/api/@rulvar/rulvar/interfaces/PipelineCollected.md)\&lt;`F`\&gt;\&gt;

#### Call Signature

```ts
pipeline<I, A, B, C, D, E, F>(
   items, 
   s1, 
   s2, 
   s3, 
   s4, 
   s5, 
   s6, 
o?): Promise<F[]>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Type Parameters

| Type Parameter |
| ------ |
| `I` |
| `A` |
| `B` |
| `C` |
| `D` |
| `E` |
| `F` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `items` | `I`[] |
| `s1` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`I`, `A`\&gt; |
| `s2` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`A`, `B`\&gt; |
| `s3` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`B`, `C`\&gt; |
| `s4` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`C`, `D`\&gt; |
| `s5` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`D`, `E`\&gt; |
| `s6` | [`Stage`](/api/@rulvar/rulvar/type-aliases/Stage.md)\&lt;`E`, `F`\&gt; |
| `o?` | [`PipelineOpts`](/api/@rulvar/rulvar/interfaces/PipelineOpts.md) |

##### Returns

`Promise`\&lt;`F`[]\&gt;

***

### random()

```ts
random(key?): number;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key?` | `string` |

#### Returns

`number`

***

### step()

```ts
step<T>(
   label, 
   fn, 
o?): Promise<T>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `label` | `string` |
| `fn` | () => `T` \| `Promise`\&lt;`T`\&gt; |
| `o?` | \{ `deps?`: [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)[]; `key?`: `string`; \} |
| `o.deps?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)[] |
| `o.key?` | `string` |

#### Returns

`Promise`\&lt;`T`\&gt;

***

### uuid()

```ts
uuid(): string;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

`string`

***

### workflow()

#### Call Signature

```ts
workflow<A, R>(
   wf, 
   args, 
o?): Promise<R>;
```

Defined in: `packages/core/dist/index.d.ts`

Runs a child workflow under the AdmissionController (M6-T06). The
child gets a nested journal scope (registered name
plus ordinal) and a hierarchical budget sub-account whose spend
propagates to every ancestor. Structural limit violations throw the
typed AdmissionRejectedError and never tear the run down; budget
rejections throw BudgetExhaustedError. The string form resolves
against the per-engine workflow registry and is the
only form available inside the worker sandbox.

##### Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `R` |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `wf` | [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`A`, `R`\&gt; |
| `args` | `A` |
| `o?` | [`WorkflowCallOpts`](/api/@rulvar/rulvar/interfaces/WorkflowCallOpts.md) |

##### Returns

`Promise`\&lt;`R`\&gt;

#### Call Signature

```ts
workflow(
   name, 
   args?, 
o?): Promise<unknown>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `args?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |
| `o?` | [`WorkflowCallOpts`](/api/@rulvar/rulvar/interfaces/WorkflowCallOpts.md) |

##### Returns

`Promise`\&lt;`unknown`\&gt;
