[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / SubprocessToolInit

# Interface: SubprocessToolInit\&lt;S\&gt;

Defined in: [packages/executor/src/subprocess.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L268)

@rulvar/executor: isolated tool executors (RV-216). Reference
ToolExecutorProvider adapters that run a tool's work OUT of the engine
process, so a tool whose input is hostile or model-generated cannot
reach host capabilities the way an in-process tool (an ordinary
function call) can.

- `subprocessExecutor` runs the tool in a child process with a scrubbed
  environment, an ephemeral workdir, a hard timeout, and bounded
  output; pair it with a `sandbox` launcher for filesystem and network
  isolation.
- `containerExecutor` runs it in a one-shot container with the network
  dropped, the filesystem read-only, and resource caps: the isolation
  the subprocess adapter cannot promise on its own.
- `subprocessTool` defines a tool that dispatches through them.
- `executorConformance` is the executable shared-contract battery.

The provider seam itself lives in @rulvar/core
(`createEngine({ executors })`). Docs:
https://docs.rulvar.com/guide/isolated-executor.

## Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args?` | readonly `string`[] | - | [packages/executor/src/subprocess.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L276) |
| <a id="property-command"></a> `command` | `string` | The program to run, and its fixed argv. | [packages/executor/src/subprocess.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L275) |
| <a id="property-description"></a> `description` | `string` | - | [packages/executor/src/subprocess.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L270) |
| <a id="property-name"></a> `name` | `string` | - | [packages/executor/src/subprocess.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L269) |
| <a id="property-needsapproval"></a> `needsApproval?` | `boolean` | The terminal permission default asks when true. | [packages/executor/src/subprocess.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L278) |
| <a id="property-parameters"></a> `parameters` | `S` | - | [packages/executor/src/subprocess.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L271) |
| <a id="property-risk"></a> `risk?` | [`ToolRisk`](/api/@rulvar/rulvar/type-aliases/ToolRisk.md) | Policy metadata; never identity. | [packages/executor/src/subprocess.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L280) |
| <a id="property-version"></a> `version?` | `string` | Contract version, part of toolsetHash. | [packages/executor/src/subprocess.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L273) |
