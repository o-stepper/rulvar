[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ExecutorConformanceSuite

# Interface: ExecutorConformanceSuite

Defined in: [packages/executor/src/conformance.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L54)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-checks"></a> `checks` | readonly [`ExecutorConformanceCheck`](/api/@rulvar/executor/interfaces/ExecutorConformanceCheck.md)[] | [packages/executor/src/conformance.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L56) |
| <a id="property-name"></a> `name` | `string` | [packages/executor/src/conformance.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L55) |

## Methods

### run()

```ts
run(): Promise<void>;
```

Defined in: [packages/executor/src/conformance.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L57)

#### Returns

`Promise`\&lt;`void`\&gt;
