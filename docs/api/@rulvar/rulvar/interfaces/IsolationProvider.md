[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / IsolationProvider

# Interface: IsolationProvider

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

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
     `patch`: [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md);
  \}\>;
  `dispose`: `Promise`\&lt;`void`\&gt;;
\}\>
