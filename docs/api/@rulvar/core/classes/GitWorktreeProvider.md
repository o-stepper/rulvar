[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GitWorktreeProvider

# Class: GitWorktreeProvider

Defined in: [packages/core/src/tools/isolation.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L56)

The shipped git worktree lifecycle. A non-git host is a typed
ConfigError at acquire.

## Implements

- [`IsolationProvider`](/api/@rulvar/core/interfaces/IsolationProvider.md)

## Constructors

### Constructor

```ts
new GitWorktreeProvider(options?): GitWorktreeProvider;
```

Defined in: [packages/core/src/tools/isolation.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L63)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`GitWorktreeProviderOptions`](/api/@rulvar/core/interfaces/GitWorktreeProviderOptions.md) |

#### Returns

`GitWorktreeProvider`

## Accessors

### pinnedWorktrees

#### Get Signature

```ts
get pinnedWorktrees(): ReadonlySet<string>;
```

Defined in: [packages/core/src/tools/isolation.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L73)

Trees currently retained under the pin cap.

##### Returns

`ReadonlySet`\&lt;`string`\&gt;

## Methods

### acquire()

```ts
acquire(spawn): Promise<{
  cwd: string;
  collect: Promise<{
     files: string[];
     patch: Bytes;
  }>;
  dispose: Promise<void>;
}>;
```

Defined in: [packages/core/src/tools/isolation.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L77)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spawn` | \{ `ref?`: `string`; `runId`: `string`; `spanId`: `string`; \} |
| `spawn.ref?` | `string` |
| `spawn.runId` | `string` |
| `spawn.spanId` | `string` |

#### Returns

`Promise`\<\{
  `cwd`: `string`;
  `collect`: `Promise`\<\{
     `files`: `string`[];
     `patch`: [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md);
  \}\>;
  `dispose`: `Promise`\&lt;`void`\&gt;;
\}\>

#### Implementation of

[`IsolationProvider`](/api/@rulvar/core/interfaces/IsolationProvider.md).[`acquire`](/api/@rulvar/core/interfaces/IsolationProvider.md#acquire)
