[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / IsolationProvider

# Interface: IsolationProvider

Defined in: [packages/core/src/l0/spi/isolation.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/isolation.ts#L18)

## Methods

### acquire()

```ts
acquire(s): Promise<{
  cwd: string;
  collect: Promise<{
     files: string[];
     patch: Bytes;
  }>;
  dispose: Promise<void>;
}>;
```

Defined in: [packages/core/src/l0/spi/isolation.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/isolation.ts#L19)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `s` | \{ `ref?`: `string`; `runId`: `string`; `spanId`: `string`; \} |
| `s.ref?` | `string` |
| `s.runId` | `string` |
| `s.spanId` | `string` |

#### Returns

`Promise`\<\{
  `cwd`: `string`;
  `collect`: `Promise`\<\{
     `files`: `string`[];
     `patch`: [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md);
  \}\>;
  `dispose`: `Promise`\&lt;`void`\&gt;;
\}\>
