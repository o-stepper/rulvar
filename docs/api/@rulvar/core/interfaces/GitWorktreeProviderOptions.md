[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GitWorktreeProviderOptions

# Interface: GitWorktreeProviderOptions

Defined in: [packages/core/src/tools/isolation.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L32)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-keeponerror"></a> `keepOnError?` | `boolean` | Retain the tree of a FAILED agent for inspection when the engine requests keep on dispose (docs/08, section 8.3). Default false. | [packages/core/src/tools/isolation.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L39) |
| <a id="property-maxpinnedworktrees"></a> `maxPinnedWorktrees?` | `number` | Pin cap shared by park/unpark and retainWorktree (default 4). | [packages/core/src/tools/isolation.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L41) |
| <a id="property-onwarn"></a> `onWarn?` | (`msg`) => `void` | Warning sink (cap overflow); defaults to process.emitWarning. | [packages/core/src/tools/isolation.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L43) |
| <a id="property-reporoot"></a> `repoRoot?` | `string` | Host repository root; default process.cwd(). | [packages/core/src/tools/isolation.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/isolation.ts#L34) |
