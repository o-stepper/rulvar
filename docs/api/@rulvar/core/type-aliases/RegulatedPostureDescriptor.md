[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RegulatedPostureDescriptor

# Type Alias: RegulatedPostureDescriptor

```ts
type RegulatedPostureDescriptor = 
  | McpSourceRegulatedPosture
  | AiSdkBridgeRegulatedPosture
  | ModelAdapterRegulatedPosture
  | ToolExecutorRegulatedPosture;
```

Defined in: [packages/core/src/l0/spi/regulated-posture.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L160)

What `describeRegulatedPosture()` returns: one of the known shapes.
