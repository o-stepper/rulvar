[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / CliIo

# Interface: CliIo

Defined in: [packages/cli/src/io.ts:9](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/io.ts#L9)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-istty"></a> `isTTY` | `boolean` | TTY-aware renderers may switch between live and plain output. | [packages/cli/src/io.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/io.ts#L18) |

## Methods

### err()

```ts
err(line): void;
```

Defined in: [packages/cli/src/io.ts:11](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/io.ts#L11)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `line` | `string` |

#### Returns

`void`

***

### out()

```ts
out(line): void;
```

Defined in: [packages/cli/src/io.ts:10](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/io.ts#L10)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `line` | `string` |

#### Returns

`void`

***

### prompt()

```ts
prompt(question): Promise<string | undefined>;
```

Defined in: [packages/cli/src/io.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/io.ts#L16)

Asks one question and resolves with the answer line, or undefined
when input is exhausted (EOF): the caller leaves the run suspended.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `question` | `string` |

#### Returns

`Promise`\&lt;`string` \| `undefined`\&gt;
