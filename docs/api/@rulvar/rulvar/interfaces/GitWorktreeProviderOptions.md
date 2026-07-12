[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / GitWorktreeProviderOptions

# Interface: GitWorktreeProviderOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-keeponerror"></a> `keepOnError?` | `boolean` | Retain the tree of a FAILED agent for inspection when the engine requests keep on dispose. Default false. | `packages/core/dist/index.d.ts` |
| <a id="property-maxpinnedworktrees"></a> `maxPinnedWorktrees?` | `number` | Pin cap shared by park/unpark and retainWorktree (default 4). | `packages/core/dist/index.d.ts` |
| <a id="property-onwarn"></a> `onWarn?` | (`msg`) => `void` | Warning sink (cap overflow); defaults to process.emitWarning. | `packages/core/dist/index.d.ts` |
| <a id="property-reporoot"></a> `repoRoot?` | `string` | Host repository root; default process.cwd(). | `packages/core/dist/index.d.ts` |
