[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Lease

# Type Alias: Lease

```ts
type Lease = {
  epoch: number;
  owner: string;
  runId: string;
};
```

Defined in: [packages/core/src/l0/spi/store.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L18)

Lease token for queue-mode ownership; epoch is the fencing token.

## Properties

### epoch

```ts
epoch: number;
```

Defined in: [packages/core/src/l0/spi/store.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L18)

***

### owner

```ts
owner: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L18)

***

### runId

```ts
runId: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L18)
