[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestratorExtension

# Interface: OrchestratorExtension

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The extension contract. PlanRunner implements it in @rulvar/plan; the
mode (c) orchestrator hosts it. Everything is optional except the
toolset: an extension that adds no tools has no reason to exist.

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-name"></a> `name` | `readonly` | `string` | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |

## Methods

### boot()?

```ts
optional boot(io): void | Promise<void>;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Runs strictly BEFORE the orchestrator agent's first entry (docs/07,
11.6: termination.init precedes the first scheduling entry and the
budget reserve). On resume it rebuilds state from the journal.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `io` | [`OrchestratorExtensionIO`](/api/@rulvar/rulvar/interfaces/OrchestratorExtensionIO.md) |

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;

***

### digestExtras()?

```ts
optional digestExtras(io): 
  | Record<string, Json>
  | undefined;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Extra fields merged into every WakeDigest (the hash-v2 coordinated
schema lands in M7-T13; the substrate merges extras verbatim).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `io` | [`OrchestratorExtensionIO`](/api/@rulvar/rulvar/interfaces/OrchestratorExtensionIO.md) |

#### Returns

  \| `Record`\&lt;`string`, [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)\&gt;
  \| `undefined`

***

### onActivity()?

```ts
optional onActivity(io): void | Promise<void>;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Called after boot and after EVERY child settlement, strictly before
wake triggers are evaluated: the scheduling edge (ready nodes
dispatch here, terminal transitions journal here).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `io` | [`OrchestratorExtensionIO`](/api/@rulvar/rulvar/interfaces/OrchestratorExtensionIO.md) |

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;

***

### onWake()?

```ts
optional onWake(digest): void;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Observes every delivered digest, including recovered pinned ones.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `digest` | [`WakeDigest`](/api/@rulvar/rulvar/interfaces/WakeDigest.md) |

#### Returns

`void`

***

### promptLines()?

```ts
optional promptLines(): string[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Extra orchestrator prompt lines describing the extension's protocol.

#### Returns

`string`[]

***

### quiescent()?

```ts
optional quiescent(): boolean;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Quiescence participation (docs/07, 4.8): the mandatory trigger fires
only when every dispatched child settled AND the extension reports
nothing running and nothing ready.

#### Returns

`boolean`

***

### tools()

```ts
tools(io): ToolDef<SchemaSpec<unknown>>[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Extension tools appended to the mode (c) toolset (docs/07, section 4).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `io` | [`OrchestratorExtensionIO`](/api/@rulvar/rulvar/interfaces/OrchestratorExtensionIO.md) |

#### Returns

[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[]
