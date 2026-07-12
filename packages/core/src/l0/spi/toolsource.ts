/**
 * ToolSource SPI and the tool contract types (M3-T01): native tools,
 * in-process MCP, and stdio/HTTP MCP behind one seam. One of the six SPI
 * seams frozen at 1.0; every source yields ToolDefs, and the Agent Runtime
 * dispatches all of them through the same permission chain, the same
 * journal semantics, and the same toolsetHash contract.
 *
 * Full contract: https://docs.rulvar.com/guide/tools (MCP sources:
 * https://docs.rulvar.com/guide/mcp).
 */
import type { Json } from '../json.js';
import type { Out, SchemaSpec } from '../schema.js';
import type { IsolationSpec } from './isolation.js';

/**
 * Declarative risk metadata on the tool contract. Policy input, not
 * identity: it does NOT enter toolsetHash.
 */
export type ToolRisk = 'read' | 'write' | 'network' | 'execute' | 'destructive';

/**
 * The context handed to execute (and to permission hooks and canUseTool).
 * Deliberately exposes NO spawn primitives: tools are leaves of the
 * call-and-return tree (invariant I3); all spawning flows through Ctx
 * primitives.
 */
export interface ToolContext {
  runId: string;
  /** Tool span in the run > phase > agent > tool hierarchy. */
  spanId: string;
  agent: { agentType: string; label?: string };
  /** Isolation working directory; host cwd under isolation 'none'. */
  cwd: string;
  /** The spawn's declared isolation. */
  isolation: IsolationSpec;
  /** Fires on cancellation, budget ceiling, UsageLimits expiry. */
  signal: AbortSignal;
  /** Emits telemetry log events; never writes journal entries. */
  log(level: 'debug' | 'info' | 'warn' | 'error', msg: string, data?: Json): void;
}

/**
 * Where execute runs. A declared capability consumed by dispatch and
 * policy; only 'inprocess' is enforced in v1, subprocess/container remain
 * declared capability while the executor design stays an open question.
 */
export type ToolExecutor = 'inprocess' | 'subprocess' | 'container';

/**
 * A defined tool. The identity projection is the ToolContract
 * { name, description, parameters, version }: exactly what the model sees
 * and exactly what toolsetHash hashes; execute and every other
 * non-contract field are excluded by construction.
 */
export interface ToolDef<S extends SchemaSpec = SchemaSpec> {
  readonly kind: 'tool';
  readonly name: string;
  readonly description: string;
  readonly parameters: S;
  /** Opaque contract version; part of toolsetHash. */
  readonly version?: string;
  /** Default 'inprocess'. */
  readonly executor: ToolExecutor;
  /** Default false; the terminal permission default asks when true. */
  readonly needsApproval: boolean;
  readonly risk?: ToolRisk;
  execute: (input: Out<S>, ctx: ToolContext) => Promise<unknown>;
}

/** Session handle passed to ToolSource.tools (minimal in v1; audited at M9). */
export interface ToolSourceSession {
  runId: string;
}

/**
 * The ToolSource seam: tools() yields the source's current ToolDefs. The
 * toolset snapshot for a given agent spawn is captured at spawn time and
 * hashed into the spawn's identity via toolsetHash; a mid-run change MUST
 * NOT mutate an in-flight agent's toolset.
 */
export interface ToolSource {
  id: string;
  tools(session: ToolSourceSession): Promise<ToolDef[]>;
}
