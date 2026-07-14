[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / GitWorktreeProvider

# Class: GitWorktreeProvider

Defined in: `packages/core/dist/index.d.ts`

The shipped git worktree lifecycle. A non-git host is a typed
ConfigError at acquire.

## Implements

- [`IsolationProvider`](/api/@rulvar/rulvar/interfaces/IsolationProvider.md)

## Constructors

### Constructor

```ts
new GitWorktreeProvider(options?): GitWorktreeProvider;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`GitWorktreeProviderOptions`](/api/@rulvar/rulvar/interfaces/GitWorktreeProviderOptions.md) |

#### Returns

`GitWorktreeProvider`

## Accessors

### pinnedWorktrees

#### Get Signature

```ts
get pinnedWorktrees(): ReadonlySet<string>;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

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
     `patch`: [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md);
  \}\>;
  `dispose`: `Promise`\&lt;`void`\&gt;;
\}\>

#### Implementation of

[`IsolationProvider`](/api/@rulvar/rulvar/interfaces/IsolationProvider.md).[`acquire`](/api/@rulvar/rulvar/interfaces/IsolationProvider.md#acquire)
