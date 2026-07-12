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

function validateConfig(cfg: McpConfig): void {
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
 * Imports MCP tools as a ToolSource. The client connects lazily on the
 * first tools() call; tools/list is fetched with cursor pagination until
 * exhaustion and cached per session; a listChanged notification
 * invalidates the cache, affecting subsequently spawned agents only (a
 * spawn's toolset snapshot is immutable by construction).
 */
export function mcp(cfg: McpConfig): ToolSource {
  validateConfig(cfg);
  let clientPromise: Promise<Client> | undefined;
  let cache: ToolDef[] | undefined;

  const connect = async (): Promise<Client> => {
    const client = new Client({ name: 'rulvar', version: '1.0.0' });
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
    client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
      // Invalidates the session cache; in-flight agents keep their
      // spawn-time snapshot.
      cache = undefined;
    });
    return client;
  };

  const listAll = async (client: Client): Promise<WireTool[]> => {
    const tools: WireTool[] = [];
    let cursor: string | undefined;
    do {
      const page = await client.listTools(cursor === undefined ? {} : { cursor });
      tools.push(...(page.tools as unknown as WireTool[]));
      cursor = page.nextCursor;
    } while (cursor !== undefined);
    return tools;
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
        const result = (await client.callTool({
          name: wire.name,
          arguments: (input ?? {}) as Record<string, unknown>,
        })) as CallToolResult;
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
      clientPromise ??= connect();
      const client = await clientPromise;
      const wireTools = await listAll(client);
      const denySet = new Set(cfg.deny ?? []);
      const allowSet = cfg.allow === undefined ? undefined : new Set(cfg.allow);
      const admitted = wireTools.filter(
        (wire) => !denySet.has(wire.name) && (allowSet === undefined || allowSet.has(wire.name)),
      );
      cache = admitted.map((wire) => toDef(client, wire));
      return cache;
    },
  };
}
