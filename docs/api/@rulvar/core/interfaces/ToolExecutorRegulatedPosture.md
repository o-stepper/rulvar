[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolExecutorRegulatedPosture

# Interface: ToolExecutorRegulatedPosture

Defined in: [packages/core/src/l0/spi/regulated-posture.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L110)

The posture an isolated tool executor chose at construction
(RV4204). The executor is the one construction that dispatches
HOST-SIDE effects, and the regulated floor requires its ledger: an
effect no ledger records is an effect nobody can reconcile, the
billingReceipts doctrine applied to tools.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allowenv"></a> `allowEnv` | readonly `string`[] | Host env names reaching the child, the exact allowlist. | [packages/core/src/l0/spi/regulated-posture.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L119) |
| <a id="property-bounds"></a> `bounds` | \{ `maxOutputBytes`: `number`; `timeoutMs`: `number`; \} | The resolved per-call ceilings (defaults resolve at construction). | [packages/core/src/l0/spi/regulated-posture.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L121) |
| `bounds.maxOutputBytes` | `number` | - | [packages/core/src/l0/spi/regulated-posture.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L121) |
| `bounds.timeoutMs` | `number` | - | [packages/core/src/l0/spi/regulated-posture.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L121) |
| <a id="property-isolation"></a> `isolation` | \| \{ `flavor`: `"subprocess"`; `sandboxed`: `boolean`; \} \| \{ `capDrop`: readonly `string`[]; `cpus`: `string`; `extraDockerArgs`: readonly `string`[]; `flavor`: `"container"`; `image`: `string`; `memory`: `string`; `network`: `string`; `pidsLimit`: `number`; `readOnlyRoot`: `boolean`; `scratchMount`: `string`; `workMount`: `string`; \} | The isolation seam, per flavor: a subprocess names whether a sandbox launcher wraps the command; a container names its network mode and root-filesystem posture and, since RV4915, everything else that decides what the container can do: the image, the dropped capabilities, the resource limits, the mount paths, and the raw extra `docker run` flags verbatim. The regulated floor judges each by name (network 'none', a read only root, `ALL` among the dropped capabilities, an image pinned by digest, no extra flags) and hashes the rest, so a moved image or a loosened cap moves the fingerprint instead of hiding beneath it. | [packages/core/src/l0/spi/regulated-posture.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L134) |
| <a id="property-kind"></a> `kind` | `"tool-executor"` | - | [packages/core/src/l0/spi/regulated-posture.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L113) |
| <a id="property-ledger"></a> `ledger` | `boolean` | Whether a ToolEffectLedger records every dispatch (intent first). | [packages/core/src/l0/spi/regulated-posture.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L117) |
| <a id="property-name"></a> `name` | `string` | The reference flavor ('subprocess', 'container') or a host name. | [packages/core/src/l0/spi/regulated-posture.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L115) |
| <a id="property-regulatedposture"></a> `regulatedPosture` | `1` | Descriptor shape version; bumps when the meaning changes. | [packages/core/src/l0/spi/regulated-posture.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L112) |
