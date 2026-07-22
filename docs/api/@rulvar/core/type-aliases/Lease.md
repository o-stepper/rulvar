[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Lease

# Type Alias: Lease

```ts
type Lease = {
  epoch: number;
  owner: string;
  runId: string;
};
```

Defined in: [packages/core/src/l0/spi/store.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L22)

Lease token for queue-mode ownership; epoch is the fencing token.

## Properties

### epoch

```ts
epoch: number;
```

Defined in: [packages/core/src/l0/spi/store.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L22)

***

### owner

```ts
owner: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L22)

***

### runId

```ts
runId: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L22)
