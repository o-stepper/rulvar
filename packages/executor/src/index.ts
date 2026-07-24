/**
 * @rulvar/executor: isolated tool executors (RV-216). Reference
 * ToolExecutorProvider adapters that run a tool's work OUT of the engine
 * process, so a tool whose input is hostile or model-generated cannot
 * reach host capabilities the way an in-process tool (an ordinary
 * function call) can.
 *
 * - `subprocessExecutor` runs the tool in a child process with a scrubbed
 *   environment, an ephemeral workdir, a hard timeout, and bounded
 *   output; pair it with a `sandbox` launcher for filesystem and network
 *   isolation.
 * - `containerExecutor` runs it in a one-shot container with the network
 *   dropped, the filesystem read-only, and resource caps: the isolation
 *   the subprocess adapter cannot promise on its own.
 * - `subprocessTool` defines a tool that dispatches through them.
 * - `executorConformance` is the executable shared-contract battery.
 *
 * The provider seam itself lives in @rulvar/core
 * (`createEngine({ executors })`). Docs:
 * https://docs.rulvar.com/guide/isolated-executor.
 */
export {
  subprocessExecutor,
  subprocessTool,
  type SubprocessExecutorOptions,
  type SubprocessCommandSpec,
  type SubprocessToolInit,
} from './subprocess.js';
export { containerExecutor, type ContainerExecutorOptions } from './container.js';
export {
  ExecutorError,
  memoryEffectLedger,
  hashArgs,
  parseToolResult,
  type ExecutorErrorCode,
  type ToolEffectLedger,
  type ToolEffectRecord,
} from './spi.js';
export {
  executorConformance,
  registerExecutorConformance,
  type ConformanceExecutorConfig,
  type ConformanceExecutorFactory,
  type ExecutorConformanceCheck,
  type ExecutorConformanceSuite,
  type ExecutorTestRegistrar,
} from './conformance.js';
export { runChildProcess, type ChildResult, type ChildSpec, type ChildStopReason } from './child.js';
