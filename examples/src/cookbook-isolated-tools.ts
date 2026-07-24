/**
 * Isolated tool execution (cookbook recipe; the rendered walk-through is
 * https://docs.rulvar.com/guide/cookbook). Three boundaries, and one
 * honest limit. Hardened executor: a tool declaring `executor:
 * 'subprocess'` runs OUT of process through `subprocessExecutor`, which
 * REPLACES the environment (host credentials scrubbed), gives each call a
 * fresh ephemeral workdir, and kills it on a timeout, so a hostile or
 * model-generated script cannot read the host's ambient credentials
 * (RV-216; the full contract and the container adapter are in
 * https://docs.rulvar.com/guide/isolated-executor). Out of process:
 * `mcp({ transport: 'stdio' })` runs tools in a child process the engine
 * spawns and closes with the run. Filesystem: a worktree isolated profile
 * gives a child agent its own checkout; its writes come back as a patch
 * artifact. The honest limit: in-process tools are ordinary function
 * calls with full host capabilities, an execution convenience, never a
 * sandbox for hostile or model generated code.
 */
import { mcp, type AgentProfile, type McpToolSource, type ToolsOption } from '@rulvar/core';
import { subprocessExecutor, subprocessTool } from '@rulvar/executor';
import type { ToolDef, ToolExecutorProvider } from '@rulvar/core';

/**
 * A subprocess executor hardened for untrusted tool input: the child sees
 * an empty environment except the credentials minted per call, runs in an
 * ephemeral workdir, and is killed after `timeoutMs`. Register it as
 * `createEngine({ executors: { subprocess: hardenedToolExecutor() } })`.
 */
export function hardenedToolExecutor(): ToolExecutorProvider {
  return subprocessExecutor({
    timeoutMs: 5_000,
    maxOutputBytes: 256 * 1024,
    // Host credentials are NOT copied; a scoped token is minted per call.
    credentials: () => ({ TOOL_TOKEN: 'scoped-and-short-lived' }),
  });
}

/**
 * A tool whose work runs under the hardened executor: it declares
 * `executor: 'subprocess'` and carries the program on `executorSpec`, so
 * dispatch routes to the registered provider instead of an in-process
 * closure. `command` reads the tool-call JSON on stdin and writes its
 * JSON result to stdout.
 */
export function sandboxedTool(command: string, args: string[]): ToolDef {
  return subprocessTool({
    name: 'sandboxed',
    description: 'runs untrusted work out of process under the hardened executor',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    command,
    args,
    risk: 'execute',
  });
}

/**
 * Tools served by a stdio child process: the source spawns
 * `command args` on first use and imports the advertised tools through
 * the same permission chain and toolset hash as native tools. The HOST
 * owns the source lifecycle exactly like a connection pool: call
 * `source.close()` when done (idempotent; a later use spawns a fresh
 * child), or the executor process outlives the run.
 */
export function outOfProcessTools(command: string, args: string[]): McpToolSource {
  return mcp({ transport: 'stdio', command, args });
}

/**
 * A child profile whose file writes stay inside its own worktree: the
 * engine materializes an isolated checkout (a GitWorktreeProvider on
 * the engine), the child works there, and the collected diff lands as
 * a durable `patch` artifact for the CALLER to apply or discard.
 */
export function isolatedWriterProfile(tools: ToolsOption): AgentProfile {
  return {
    description: 'writes files inside an isolated worktree; changes land as a patch artifact',
    isolation: { kind: 'worktree' },
    tools,
  };
}
