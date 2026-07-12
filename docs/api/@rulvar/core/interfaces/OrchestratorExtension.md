[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestratorExtension

# Interface: OrchestratorExtension

Defined in: [packages/core/src/orchestrator/extension.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L156)

The extension contract. PlanRunner implements it in @rulvar/plan; the
mode (c) orchestrator hosts it. Everything is optional except the
toolset: an extension that adds no tools has no reason to exist.

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-name"></a> `name` | `readonly` | `string` | [packages/core/src/orchestrator/extension.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L157) |

## Methods

### boot()?

```ts
optional boot(io): void | Promise<void>;
```

Defined in: [packages/core/src/orchestrator/extension.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L163)

Runs strictly BEFORE the orchestrator agent's first entry
(termination.init precedes the first scheduling entry and the
budget reserve). On resume it rebuilds state from the journal.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `io` | [`OrchestratorExtensionIO`](/api/@rulvar/core/interfaces/OrchestratorExtensionIO.md) |

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;

***

### digestExtras()?

```ts
optional digestExtras(io): 
  | Record<string, Json>
  | undefined;
```

Defined in: [packages/core/src/orchestrator/extension.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L184)

Extra fields merged into every WakeDigest (the hash-v2 coordinated
schema lands in M7-T13; the substrate merges extras verbatim).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `io` | [`OrchestratorExtensionIO`](/api/@rulvar/core/interfaces/OrchestratorExtensionIO.md) |

#### Returns

  \| `Record`\&lt;`string`, [`Json`](/api/@rulvar/core/type-aliases/Json.md)\&gt;
  \| `undefined`

***

### onActivity()?

```ts
optional onActivity(io): void | Promise<void>;
```

Defined in: [packages/core/src/orchestrator/extension.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L173)

Called after boot and after EVERY child settlement, strictly before
wake triggers are evaluated: the scheduling edge (ready nodes
dispatch here, terminal transitions journal here).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `io` | [`OrchestratorExtensionIO`](/api/@rulvar/core/interfaces/OrchestratorExtensionIO.md) |

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;

***

### onWake()?

```ts
optional onWake(digest): void;
```

Defined in: [packages/core/src/orchestrator/extension.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L186)

Observes every delivered digest, including recovered pinned ones.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `digest` | [`WakeDigest`](/api/@rulvar/core/interfaces/WakeDigest.md) |

#### Returns

`void`

***

### promptLines()?

```ts
optional promptLines(): string[];
```

Defined in: [packages/core/src/orchestrator/extension.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L167)

Extra orchestrator prompt lines describing the extension's protocol.

#### Returns

`string`[]

***

### quiescent()?

```ts
optional quiescent(): boolean;
```

Defined in: [packages/core/src/orchestrator/extension.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L179)

Quiescence participation: the mandatory trigger fires
only when every dispatched child settled AND the extension reports
nothing running and nothing ready.

#### Returns

`boolean`

***

### tools()

```ts
tools(io): ToolDef<SchemaSpec>[];
```

Defined in: [packages/core/src/orchestrator/extension.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L165)

Extension tools appended to the mode (c) toolset.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `io` | [`OrchestratorExtensionIO`](/api/@rulvar/core/interfaces/OrchestratorExtensionIO.md) |

#### Returns

[`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[]
