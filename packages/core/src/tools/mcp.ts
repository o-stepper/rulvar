/**
 * MCP ToolSource (M3-T04): mcp(cfg) imports Model Context Protocol tools
 * over stdio, streamable-http, or an in-process server instance and makes
 * them indistinguishable from native tools: the same ToolDef shape, the
 * same permission chain, the same journal semantics, the same toolsetHash
 * contract. Pinned SDK line: @modelcontextprotocol/sdk ^1.29 (the v2
 * migration is the explicit post-M3 task M5-T10; risk R1).
 *
 * Docs: https://docs.rulvar.com/guide/mcp.
 */
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

import { ConfigError } from '../l0/errors.js';
import type { JsonSchema } from '../l0/messages.js';
import { validateSchemaSpec } from '../l0/schema.js';
import type { ToolDef, ToolRisk, ToolSource } from '../l0/spi/toolsource.js';
import { tool, TOOL_NAME_PATTERN } from './tool.js';

export interface McpConfig {
  transport: 'stdio' | 'streamable-http' | 'inprocess';
  /** stdio: child process to spawn. */
  command?: string;
  args?: string[];
  /** streamable-http: server endpoint. */
  url?: string;
  /** inprocess: in-memory server instance (anything with connect()). */
  server?: unknown;
  /** Tool-name filter on ORIGINAL names; omitted = all. */
  allow?: string[];
  /** Deny wins over allow (pre-prefix names). */
  deny?: string[];
  /** Namespaces imported names as `${prefix}_${name}`. */
  prefix?: string;
  /** true = every imported tool needsApproval; record form is per name. */
  approval?: boolean | Record<string, boolean>;
  /** Host-supplied risk labels for imported tools. */
  risk?: Record<string, ToolRisk>;
  /**
   * Cap on WIRE tools accepted from the tools/list sweep (RV1515),
   * checked after each page, PRE-filter: the sweep itself is the
   * resource being bounded, so allow/deny cannot admit past it. A
   * server that streams more refuses typed. Positive integer; absent =
   * unbounded (today's behavior).
   */
  maxTools?: number;
  /**
   * Per ADMITTED tool (allow/deny filter first): the UTF-8 byte length
   * of the serialized inputSchema plus outputSchema when present
   * (RV1515). An oversized tool refuses the resolution typed, naming
   * the tool and its measured bytes; deny the tool or raise the cap.
   * Positive integer; absent = unbounded.
   */
  maxSchemaBytes?: number;
  /**
   * Per-source latency bounds (RV1515). connectMs races the transport
   * handshake (on expiry the client, and for stdio its child, is
   * released and the refusal is typed). listMs and callMs ride the SDK
   * request timeout per tools/list page and per tools/call; without
   * them the SDK's own 60s default request timeout applies. A call
   * timeout surfaces as the tool's error result, never past policy.
   * Each a positive finite number of milliseconds.
   */
  timeouts?: { connectMs?: number; listMs?: number; callMs?: number };
}

interface WireTool {
  name: string;
  description?: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
}

interface CallToolResult {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  structuredContent?: unknown;
  isError?: boolean;
}

/**
 * The ToolSource returned by {@link mcp}: the frozen ToolSource seam
 * plus the lifecycle the seam deliberately leaves to the host.
 * `close()` releases everything the source created on first use: the
 * SDK client, its transport, and, for stdio, the spawned child
 * process, without which a one shot host process cannot exit
 * naturally after a run, because the child and its pipes keep the
 * event loop alive (v1.33.0 review P2). It is idempotent, resolves
 * even when the connection never succeeded, and resets the source, so
 * a later `tools()` call connects afresh. The engine never closes a
 * source, because one source may serve many runs: the host owns the
 * lifecycle and should close once its runs have settled (closing
 * while a run is in flight fails that run's MCP tool calls).
 */
export interface McpToolSource extends ToolSource {
  close(): Promise<void>;
}

function validateBounds(cfg: McpConfig): void {
  const positiveInt = (key: 'maxTools' | 'maxSchemaBytes'): void => {
    const value = cfg[key];
    if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
      throw new ConfigError(`mcp: '${key}' must be a positive integer, got ${String(value)}`);
    }
  };
  positiveInt('maxTools');
  positiveInt('maxSchemaBytes');
  for (const key of ['connectMs', 'listMs', 'callMs'] as const) {
    const value = cfg.timeouts?.[key];
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      throw new ConfigError(
        `mcp: 'timeouts.${key}' must be a positive finite number of milliseconds, ` +
          `got ${String(value)}`,
      );
    }
  }
}

function validateConfig(cfg: McpConfig): void {
  validateBounds(cfg);
  const forbid = (key: 'command' | 'args' | 'url' | 'server'): void => {
    if (cfg[key] !== undefined) {
      throw new ConfigError(
        `mcp: '${key}' is not a config key of the '${cfg.transport}' transport ` +
          '(exactly the keys matching the chosen transport)',
      );
    }
  };
  switch (cfg.transport) {
    case 'stdio':
      if (cfg.command === undefined) {
        throw new ConfigError("mcp: the stdio transport requires 'command'");
      }
      forbid('url');
      forbid('server');
      return;
    case 'streamable-http':
      if (cfg.url === undefined) {
        throw new ConfigError("mcp: the streamable-http transport requires 'url'");
      }
      forbid('command');
      forbid('args');
      forbid('server');
      return;
    case 'inprocess':
      if (cfg.server === undefined) {
        throw new ConfigError("mcp: the inprocess transport requires 'server'");
      }
      forbid('command');
      forbid('args');
      forbid('url');
      return;
    default:
      throw new ConfigError(
        `mcp: unknown transport '${String((cfg as { transport: unknown }).transport)}'`,
      );
  }
}

function sourceIdOf(cfg: McpConfig): string {
  switch (cfg.transport) {
    case 'stdio':
      return `mcp:stdio:${cfg.command ?? ''}`;
    case 'streamable-http':
      return `mcp:http:${cfg.url ?? ''}`;
    default:
      return 'mcp:inprocess';
  }
}

/** Concatenates text blocks; non-text blocks are preserved as typed parts. */
function mapContent(result: CallToolResult): unknown {
  const blocks = result.content ?? [];
  if (blocks.every((block) => block.type === 'text')) {
    return blocks.map((block) => block.text ?? '').join('');
  }
  return blocks.map((block) =>
    block.type === 'text' ? { type: 'text', text: block.text ?? '' } : block,
  );
}

function errorText(result: CallToolResult): string {
  const blocks = result.content ?? [];
  const text = blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');
  return text === '' ? 'MCP tool reported an error' : text;
}

/**
 * Imports MCP tools as a {@link McpToolSource}. The client connects
 * lazily on the first tools() call; tools/list is fetched with cursor
 * pagination until exhaustion and cached per session; a listChanged
 * notification invalidates the cache, affecting subsequently spawned
 * agents only (a spawn's toolset snapshot is immutable by
 * construction). The host owns the source's lifecycle: `close()`
 * releases the client, the transport, and the stdio child once the
 * runs using the source have settled; a one shot host should close in
 * a finally block, or its process never exits naturally (v1.33.0
 * review P2).
 */
export function mcp(cfg: McpConfig): McpToolSource {
  validateConfig(cfg);
  let clientPromise: Promise<Client> | undefined;
  let cache: ToolDef[] | undefined;
  // Bumped by every listChanged notification: a fetch that began before
  // the bump must not pin its (already stale) list as the session cache,
  // or the invalidation is lost until the NEXT notification (cycle 79).
  let generation = 0;
  // Concurrent cold tools() calls share one fetch instead of each
  // sweeping tools/list (cycle 80).
  let inFlight: Promise<ToolDef[]> | undefined;

  const connect = async (): Promise<Client> => {
    const client = new Client({ name: 'rulvar', version: '1.0.0' });
    const attach = async (): Promise<void> => {
      if (cfg.transport === 'stdio') {
        const transport = new StdioClientTransport({
          command: cfg.command ?? '',
          ...(cfg.args === undefined ? {} : { args: cfg.args }),
        });
        await client.connect(transport);
      } else if (cfg.transport === 'streamable-http') {
        const transport = new StreamableHTTPClientTransport(new URL(cfg.url ?? ''));
        await client.connect(transport);
      } else {
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        const server = cfg.server as { connect(transport: unknown): Promise<void> };
        await server.connect(serverTransport);
        await client.connect(clientTransport);
      }
    };
    try {
      const budgetMs = cfg.timeouts?.connectMs;
      if (budgetMs === undefined) {
        await attach();
      } else {
        // The race rejection lands in the same catch as any attach
        // failure, so the client (and a stdio child) is released on
        // expiry exactly like on a failed handshake (RV1515).
        let timer: ReturnType<typeof setTimeout> | undefined;
        const expired = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            reject(
              new ConfigError(`mcp: connect to '${sourceIdOf(cfg)}' timed out after ${budgetMs}ms`),
            );
          }, budgetMs);
        });
        try {
          await Promise.race([attach(), expired]);
        } finally {
          clearTimeout(timer);
        }
      }
    } catch (error) {
      // The SDK wires the transport onto the client before the
      // handshake, and for stdio that transport already owns a spawned
      // child; a failed connect must release both, or the child would
      // outlive the error the caller sees (v1.33.0 review P2).
      await client.close().catch(() => undefined);
      throw error;
    }
    client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
      // Invalidates the session cache; in-flight agents keep their
      // spawn-time snapshot.
      generation += 1;
      cache = undefined;
    });
    return client;
  };

  const listAll = async (client: Client): Promise<WireTool[]> => {
    const tools: WireTool[] = [];
    let cursor: string | undefined;
    const listOptions =
      cfg.timeouts?.listMs === undefined ? undefined : { timeout: cfg.timeouts.listMs };
    do {
      const page = await client.listTools(cursor === undefined ? {} : { cursor }, listOptions);
      tools.push(...(page.tools as unknown as WireTool[]));
      if (cfg.maxTools !== undefined && tools.length > cfg.maxTools) {
        // The sweep is bounded BEFORE the next page fetch and before any
        // filtering: the resource being capped is the sweep itself, so a
        // hostile server cannot stream past it and allow/deny cannot
        // admit past it (RV1515).
        throw new ConfigError(
          `mcp: tools/list of '${sourceIdOf(cfg)}' returned at least ${tools.length} wire ` +
            `tools, over the declared maxTools ${cfg.maxTools}; raise the cap or trim the server`,
        );
      }
      cursor = page.nextCursor;
      // An empty cursor is exhaustion: a server echoing '' forever would
      // otherwise spin this loop on microtasks and starve the event loop.
    } while (cursor !== undefined && cursor !== '');
    return tools;
  };

  const enforceSchemaBytes = (wire: WireTool): void => {
    if (cfg.maxSchemaBytes === undefined) {
      return;
    }
    const bytes = Buffer.byteLength(
      JSON.stringify(wire.inputSchema) +
        (wire.outputSchema === undefined ? '' : JSON.stringify(wire.outputSchema)),
      'utf8',
    );
    if (bytes > cfg.maxSchemaBytes) {
      throw new ConfigError(
        `mcp: tool '${wire.name}' declares ${bytes} bytes of schema, over the declared ` +
          `maxSchemaBytes ${cfg.maxSchemaBytes}; deny the tool or raise the cap`,
      );
    }
  };

  const needsApprovalFor = (originalName: string): boolean => {
    if (cfg.approval === undefined) {
      return false;
    }
    if (typeof cfg.approval === 'boolean') {
      return cfg.approval;
    }
    return cfg.approval[originalName] ?? false;
  };

  const toDef = (client: Client, wire: WireTool): ToolDef => {
    const name = cfg.prefix === undefined ? wire.name : `${cfg.prefix}_${wire.name}`;
    if (!TOOL_NAME_PATTERN.test(name)) {
      throw new ConfigError(
        `mcp: imported tool name '${name}' must match ^[a-zA-Z0-9_-]{1,64}$ ` + '',
      );
    }
    const risk = cfg.risk?.[wire.name];
    // The contract tuple hashes version as absent: MCP tools have no
    // version field; provider-side drift of the
    // description or inputSchema re-keys new spawns by design.
    return tool({
      name,
      description: wire.description ?? '',
      parameters: wire.inputSchema,
      needsApproval: needsApprovalFor(wire.name),
      ...(risk === undefined ? {} : { risk }),
      execute: async (input) => {
        const result = (await client.callTool(
          {
            name: wire.name,
            arguments: (input ?? {}) as Record<string, unknown>,
          },
          undefined,
          // callMs rides the SDK request timeout; its expiry throws here
          // and surfaces as this tool's error result, never past policy
          // (RV1515). Without it the SDK's 60s default applies.
          cfg.timeouts?.callMs === undefined ? undefined : { timeout: cfg.timeouts.callMs },
        )) as CallToolResult;
        if (result.isError === true) {
          // isError maps to an error tool result surfaced to the model;
          // it never throws past policy.
          throw new Error(errorText(result));
        }
        if (result.structuredContent !== undefined) {
          if (wire.outputSchema !== undefined) {
            const validation = await validateSchemaSpec(
              wire.outputSchema,
              result.structuredContent,
            );
            if (!validation.valid) {
              throw new Error(
                `structuredContent of '${wire.name}' does not validate against its ` +
                  `outputSchema: ${validation.issues.map((issue) => issue.message).join('; ')}`,
              );
            }
          }
          return result.structuredContent;
        }
        // A declared outputSchema with NO structuredContent in the result
        // is rejected by the pinned SDK client itself (-32600) before this
        // point; the cycle 79 test pins that enforcement so the M5-T10 v2
        // migration cannot silently drop it.
        return mapContent(result);
      },
    });
  };

  return {
    id: sourceIdOf(cfg),
    tools: async () => {
      if (cache !== undefined) {
        return cache;
      }
      if (inFlight !== undefined) {
        return inFlight;
      }
      const fetch = (async (): Promise<ToolDef[]> => {
        clientPromise ??= connect();
        const client = await clientPromise;
        const fetchedAt = generation;
        const wireTools = await listAll(client);
        const denySet = new Set(cfg.deny ?? []);
        const allowSet = cfg.allow === undefined ? undefined : new Set(cfg.allow);
        const admitted = wireTools.filter(
          (wire) => !denySet.has(wire.name) && (allowSet === undefined || allowSet.has(wire.name)),
        );
        for (const wire of admitted) {
          // Bounded after the filter: a denied tool's schema costs the
          // toolset nothing, so only what would enter the snapshot is
          // measured (RV1515).
          enforceSchemaBytes(wire);
        }
        const defs = admitted.map((wire) => toDef(client, wire));
        if (generation === fetchedAt) {
          cache = defs;
        }
        return defs;
      })();
      inFlight = fetch;
      try {
        return await fetch;
      } finally {
        inFlight = undefined;
      }
    },
    close: async () => {
      const pending = clientPromise;
      clientPromise = undefined;
      cache = undefined;
      if (pending === undefined) {
        return;
      }
      let client: Client;
      try {
        client = await pending;
      } catch {
        // A failed connect released its transport on the way out, so
        // there is nothing left to close here, and close() is cleanup:
        // the connection error already surfaced to the tools() caller.
        return;
      }
      await client.close();
    },
  };
}
