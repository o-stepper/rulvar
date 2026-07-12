[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SandboxBridge

# Interface: SandboxBridge

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | The run id; the worker seeds its deterministic shims from it. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |

## Methods

### close()

```ts
close(): void;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Releases the activity token and rejects outstanding thunks.

#### Returns

`void`

***

### onMessage()

```ts
onMessage(message): void;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Feeds one worker message into the bridge.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | [`SandboxWorkerToHost`](/api/@rulvar/rulvar/type-aliases/SandboxWorkerToHost.md) |

#### Returns

`void`
