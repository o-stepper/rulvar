[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SandboxBridge

# Interface: SandboxBridge

Defined in: [packages/core/src/runner/sandbox-bridge.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/sandbox-bridge.ts#L77)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | The run id; the worker seeds its deterministic shims from it. | [packages/core/src/runner/sandbox-bridge.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/sandbox-bridge.ts#L79) |

## Methods

### close()

```ts
close(): void;
```

Defined in: [packages/core/src/runner/sandbox-bridge.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/sandbox-bridge.ts#L83)

Releases the activity token and rejects outstanding thunks.

#### Returns

`void`

***

### onMessage()

```ts
onMessage(message): void;
```

Defined in: [packages/core/src/runner/sandbox-bridge.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/sandbox-bridge.ts#L81)

Feeds one worker message into the bridge.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | [`SandboxWorkerToHost`](/api/@rulvar/core/type-aliases/SandboxWorkerToHost.md) |

#### Returns

`void`
