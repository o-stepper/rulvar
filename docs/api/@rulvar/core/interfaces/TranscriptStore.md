[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TranscriptStore

# Interface: TranscriptStore

Defined in: [packages/core/src/l0/spi/transcript.ts:11](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/transcript.ts#L11)

## Methods

### delete()

```ts
delete(ref): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/transcript.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/transcript.ts#L21)

Deletes one blob; a missing ref is a no-op, never an error (M8-T04
amendment, OQ-20: retention is impossible without blob deletion).
The cascade over a run's blobs is ENGINE-side (Engine.deleteRun),
never a store obligation.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### get()

```ts
get(ref): Promise<Bytes | null>;
```

Defined in: [packages/core/src/l0/spi/transcript.ts:13](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/transcript.ts#L13)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |

#### Returns

`Promise`\&lt;[`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) \| `null`\&gt;

***

### list()

```ts
list(runId): Promise<string[]>;
```

Defined in: [packages/core/src/l0/spi/transcript.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/transcript.ts#L14)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`string`[]\&gt;

***

### put()

```ts
put(ref, blob): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/transcript.ts:12](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/transcript.ts#L12)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `string` |
| `blob` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) |

#### Returns

`Promise`\&lt;`void`\&gt;
