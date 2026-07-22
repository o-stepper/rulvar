/**
 * Isolated tool execution today (cookbook recipe; the rendered
 * walk-through is https://docs.rulvar.com/guide/cookbook). Two
 * boundaries exist RIGHT NOW, and one honest limit. Out of process:
 * `mcp({ transport: 'stdio' })` runs the tools in a child process the
 * engine spawns and closes with the run, so a crashing or leaking tool
 * never takes the engine down and the OS owns the kill. Filesystem:
 * a worktree isolated profile gives a child agent its own checkout; its
 * writes come back as a patch artifact, never as direct host mutations.
 * The honest limit: in-process tools are ordinary function calls with
 * full host capabilities, an execution convenience, never a sandbox for
 * hostile or model generated code; the hard executor contract
 * (CPU/memory limits, network allowlists) remains host territory.
 */
import { mcp, type AgentProfile, type McpToolSource, type ToolsOption } from '@rulvar/core';

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
