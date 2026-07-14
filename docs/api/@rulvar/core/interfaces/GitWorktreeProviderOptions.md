[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GitWorktreeProviderOptions

# Interface: GitWorktreeProviderOptions

Defined in: [packages/core/src/tools/isolation.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L31)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-keeponerror"></a> `keepOnError?` | `boolean` | Retain the tree of a FAILED agent for inspection when the engine requests keep on dispose. Default false. | [packages/core/src/tools/isolation.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L38) |
| <a id="property-maxpinnedworktrees"></a> `maxPinnedWorktrees?` | `number` | Pin cap shared by park/unpark and retainWorktree (default 4). | [packages/core/src/tools/isolation.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L40) |
| <a id="property-onwarn"></a> `onWarn?` | (`msg`) => `void` | Warning sink (cap overflow); defaults to process.emitWarning. | [packages/core/src/tools/isolation.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L42) |
| <a id="property-reporoot"></a> `repoRoot?` | `string` | Host repository root; default process.cwd(). | [packages/core/src/tools/isolation.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L33) |
