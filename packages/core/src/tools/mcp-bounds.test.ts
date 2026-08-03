/**
 * MCP protocol bounds (RV1515): the tools/list sweep, the per-tool
 * schema size, and the connect/list/call latencies were unbounded on
 * the host side (the SDK's 60s default request timeout was the only
 * backstop). A hostile or misconfigured server could stream pages
 * forever, ship a schema bomb, or hang the handshake. All three bounds
 * are opt-in config; absence preserves today's behavior byte for byte.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ToolContext } from '../l0/spi/toolsource.js';
import { mcp } from './mcp.js';
import { resolveToolset } from './toolset-hash.js';

const SESSION = { runId: 'run-bounds' };

function toolContext(): ToolContext {
  return {
    runId: 'run-bounds',
    spanId: 'span-1',
    agent: { agentType: '' },
    cwd: process.cwd(),
    isolation: 'none',
    signal: new AbortController().signal,
    log: () => undefined,
  };
}

function pagedServer(): Server {
  const lowLevel = new Server({ name: 'paged', version: '1.0.0' }, { capabilities: { tools: {} } });
  lowLevel.setRequestHandler(ListToolsRequestSchema, (request) => {
    if (request.params?.cursor === 'page-2') {
      return {
        tools: [{ name: 'two', description: 'second', inputSchema: { type: 'object' as const } }],
      };
    }
    return {
      tools: [{ name: 'one', description: 'first', inputSchema: { type: 'object' as const } }],
      nextCursor: 'page-2',
    };
  });
  return lowLevel;
}

function fatSchema(): Record<string, unknown> {
  return {
    type: 'object' as const,
    properties: {
      pick: { type: 'string', enum: Array.from({ length: 64 }, (_, i) => `option-${i}-padding`) },
    },
  };
}

describe('mcp bounds config validation (RV1515)', () => {
  const server = new McpServer({ name: 'x', version: '1.0.0' });
  it('maxTools and maxSchemaBytes must be positive integers', () => {
    for (const maxTools of [0, -1, 1.5]) {
      expect(() => mcp({ transport: 'inprocess', server, maxTools })).toThrow(ConfigError);
      expect(() => mcp({ transport: 'inprocess', server, maxTools })).toThrow(/maxTools/u);
    }
    expect(() => mcp({ transport: 'inprocess', server, maxSchemaBytes: 0 })).toThrow(
      /maxSchemaBytes/u,
    );
  });
  it('each timeout must be a positive finite number of milliseconds', () => {
    expect(() => mcp({ transport: 'inprocess', server, timeouts: { callMs: -5 } })).toThrow(
      /callMs/u,
    );
    expect(() => mcp({ transport: 'inprocess', server, timeouts: { listMs: Number.NaN } })).toThrow(
      /listMs/u,
    );
    expect(() =>
      mcp({ transport: 'inprocess', server, timeouts: { connectMs: Infinity } }),
    ).toThrow(/connectMs/u);
  });
});

describe('the tools/list sweep cap (RV1515)', () => {
  it('a paginated sweep past the cap refuses typed, naming count and cap', async () => {
    const source = mcp({ transport: 'inprocess', server: pagedServer(), maxTools: 1 });
    await expect(source.tools(SESSION)).rejects.toThrow(ConfigError);
    const again = mcp({ transport: 'inprocess', server: pagedServer(), maxTools: 1 });
    await expect(again.tools(SESSION)).rejects.toThrow(/at least 2 wire tools.*maxTools 1/u);
  });

  it('a cap that fits imports both pages unchanged', async () => {
    const source = mcp({ transport: 'inprocess', server: pagedServer(), maxTools: 2 });
    const toolset = await resolveToolset([source], SESSION);
    expect(toolset.tools.map((def) => def.name).sort()).toEqual(['one', 'two']);
  });

  it('the cap is pre-filter: allow cannot admit past the sweep bound', async () => {
    const lowLevel = new Server(
      { name: 'wide', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );
    lowLevel.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: ['one', 'two', 'three'].map((name) => ({
        name,
        description: name,
        inputSchema: { type: 'object' as const },
      })),
    }));
    const source = mcp({
      transport: 'inprocess',
      server: lowLevel,
      allow: ['one'],
      maxTools: 2,
    });
    await expect(source.tools(SESSION)).rejects.toThrow(/at least 3 wire tools.*maxTools 2/u);
  });
});

describe('the per-tool schema byte cap (RV1515)', () => {
  function fatServer(): Server {
    const lowLevel = new Server({ name: 'fat', version: '1.0.0' }, { capabilities: { tools: {} } });
    lowLevel.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [
        { name: 'slim', description: 'fine', inputSchema: { type: 'object' as const } },
        { name: 'fat', description: 'oversized', inputSchema: fatSchema() },
      ],
    }));
    return lowLevel;
  }

  it('an admitted tool over the cap refuses typed, naming the tool and its bytes', async () => {
    const source = mcp({ transport: 'inprocess', server: fatServer(), maxSchemaBytes: 256 });
    await expect(source.tools(SESSION)).rejects.toThrow(ConfigError);
    const again = mcp({ transport: 'inprocess', server: fatServer(), maxSchemaBytes: 256 });
    await expect(again.tools(SESSION)).rejects.toThrow(/tool 'fat' declares \d+ bytes of schema/u);
  });

  it('a denied tool never trips the bound: allow/deny filter first', async () => {
    const source = mcp({
      transport: 'inprocess',
      server: fatServer(),
      deny: ['fat'],
      maxSchemaBytes: 256,
    });
    const defs = await source.tools(SESSION);
    expect(defs.map((def) => def.name)).toEqual(['slim']);
  });

  it('a generous cap imports everything', async () => {
    const source = mcp({ transport: 'inprocess', server: fatServer(), maxSchemaBytes: 65536 });
    const defs = await source.tools(SESSION);
    expect(defs.map((def) => def.name).sort()).toEqual(['fat', 'slim']);
  });
});

describe('the per-source timeouts (RV1515)', () => {
  function slowCallServer(delayMs: number): Server {
    const lowLevel = new Server(
      { name: 'slow-call', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );
    lowLevel.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [{ name: 'sleepy', description: 'slow', inputSchema: { type: 'object' as const } }],
    }));
    lowLevel.setRequestHandler(CallToolRequestSchema, async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return { content: [{ type: 'text' as const, text: 'woke' }] };
    });
    return lowLevel;
  }

  it('callMs bounds a hanging tool call: the timeout surfaces as the tool error', async () => {
    const source = mcp({
      transport: 'inprocess',
      server: slowCallServer(400),
      timeouts: { callMs: 50 },
    });
    const defs = await source.tools(SESSION);
    await expect(defs[0]?.execute({}, toolContext())).rejects.toThrow(/timed out/iu);
  });

  it('a fast call inside callMs resolves unchanged', async () => {
    const source = mcp({
      transport: 'inprocess',
      server: slowCallServer(0),
      timeouts: { callMs: 5000 },
    });
    const defs = await source.tools(SESSION);
    await expect(defs[0]?.execute({}, toolContext())).resolves.toBe('woke');
  });

  it('listMs bounds a hanging tools/list', async () => {
    const lowLevel = new Server(
      { name: 'slow-list', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );
    lowLevel.setRequestHandler(ListToolsRequestSchema, async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return { tools: [] };
    });
    const source = mcp({ transport: 'inprocess', server: lowLevel, timeouts: { listMs: 50 } });
    await expect(source.tools(SESSION)).rejects.toThrow(/timed out/iu);
  });

  it('connectMs bounds a handshake that never completes, typed and closed', async () => {
    // `sleep` never answers the initialize request, so without the bound
    // the handshake hangs on the SDK's 60s default.
    const source = mcp({
      transport: 'stdio',
      command: 'sleep',
      args: ['30'],
      timeouts: { connectMs: 150 },
    });
    await expect(source.tools(SESSION)).rejects.toThrow(ConfigError);
    const again = mcp({
      transport: 'stdio',
      command: 'sleep',
      args: ['30'],
      timeouts: { connectMs: 150 },
    });
    await expect(again.tools(SESSION)).rejects.toThrow(/connect.*timed out after 150ms/u);
    // close() after the refusal is clean and idempotent.
    await expect(source.close()).resolves.toBeUndefined();
    await expect(again.close()).resolves.toBeUndefined();
  });
});
