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

function echoCursorServer(withTools: boolean): Server & { listCalls: () => number } {
  let calls = 0;
  const lowLevel = new Server({ name: 'echo', version: '1.0.0' }, { capabilities: { tools: {} } });
  lowLevel.setRequestHandler(ListToolsRequestSchema, (request) => {
    calls += 1;
    return {
      tools: withTools
        ? [
            {
              name: `tool-${String(calls)}`,
              description: 'grows',
              inputSchema: { type: 'object' as const },
            },
          ]
        : [],
      // The self-loop: whatever cursor the page was queried with comes
      // back as nextCursor, so the sweep would refetch this page forever.
      // The echo stops after 25 pages. The inprocess round trip settles
      // entirely in the microtask queue, so a sweep with the cycle guard
      // disabled (the mutation probe) would starve the test timeout and
      // spin forever; against the net it resolves instead, and the
      // rejection assertions below fail fast. The guard itself must
      // refuse on page 2, far under the net.
      ...(calls < 25
        ? {
            nextCursor: typeof request.params?.cursor === 'string' ? request.params.cursor : 'loop',
          }
        : {}),
    };
  });
  return Object.assign(lowLevel, { listCalls: () => calls });
}

function endlessCursorServer(): Server & { listCalls: () => number } {
  let calls = 0;
  const lowLevel = new Server(
    { name: 'endless', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );
  lowLevel.setRequestHandler(ListToolsRequestSchema, () => {
    calls += 1;
    return { tools: [], nextCursor: `page-${String(calls + 1)}` };
  });
  return Object.assign(lowLevel, { listCalls: () => calls });
}

describe('the pagination termination bounds (RV1602)', () => {
  it('maxPages must be a positive integer', () => {
    const server = new McpServer({ name: 'x', version: '1.0.0' });
    for (const maxPages of [0, -1, 1.5]) {
      expect(() => mcp({ transport: 'inprocess', server, maxPages })).toThrow(ConfigError);
      expect(() => mcp({ transport: 'inprocess', server, maxPages })).toThrow(/maxPages/u);
    }
  });

  it('a server echoing back the queried cursor refuses typed with no bound configured', async () => {
    const server = echoCursorServer(false);
    const source = mcp({ transport: 'inprocess', server });
    await expect(source.tools(SESSION)).rejects.toThrow(ConfigError);
    // The violation is provable on the second page: the sweep never
    // spins a third wire call, and no external timeout is involved.
    expect(server.listCalls()).toBe(2);
    const again = mcp({ transport: 'inprocess', server: echoCursorServer(false) });
    await expect(again.tools(SESSION)).rejects.toThrow(/cursor it was queried with/u);
  });

  it('the cycle guard trips even while the tool list grows', async () => {
    const server = echoCursorServer(true);
    const source = mcp({ transport: 'inprocess', server });
    await expect(source.tools(SESSION)).rejects.toThrow(/cursor it was queried with/u);
    expect(server.listCalls()).toBe(2);
  });

  it('unique cursors with no progress stop at maxPages, fail closed', async () => {
    const server = endlessCursorServer();
    const source = mcp({ transport: 'inprocess', server, maxPages: 3 });
    await expect(source.tools(SESSION)).rejects.toThrow(ConfigError);
    expect(server.listCalls()).toBe(3);
    const again = mcp({ transport: 'inprocess', server: endlessCursorServer(), maxPages: 3 });
    await expect(again.tools(SESSION)).rejects.toThrow(/maxPages 3/u);
  });

  it('a finite pagination inside maxPages imports unchanged', async () => {
    const source = mcp({ transport: 'inprocess', server: pagedServer(), maxPages: 2 });
    const toolset = await resolveToolset([source], SESSION);
    expect(toolset.tools.map((def) => def.name).sort()).toEqual(['one', 'two']);
  });
});

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

function alternatingCursorServer(): Server & { listCalls: () => number } {
  let calls = 0;
  const lowLevel = new Server(
    { name: 'alternating', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );
  lowLevel.setRequestHandler(ListToolsRequestSchema, (request) => {
    calls += 1;
    const cursor = typeof request.params?.cursor === 'string' ? request.params.cursor : undefined;
    // A then B then A again: never the SAME cursor echoed back, so the
    // RV1602 echo guard is blind to it; the net stops at 25 pages like
    // the echo fixture, so a disabled guard resolves instead of
    // starving the test timeout.
    return {
      tools: [],
      ...(calls < 25 ? { nextCursor: cursor === 'cycle-a' ? 'cycle-b' : 'cycle-a' } : {}),
    };
  });
  return Object.assign(lowLevel, { listCalls: () => calls });
}

function slowEndlessServer(delayMs: number): Server & { listCalls: () => number } {
  let calls = 0;
  const lowLevel = new Server(
    { name: 'slow-endless', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );
  lowLevel.setRequestHandler(ListToolsRequestSchema, async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return {
      tools: [],
      ...(calls < 25 ? { nextCursor: `page-${String(calls + 1)}` } : {}),
    };
  });
  return Object.assign(lowLevel, { listCalls: () => calls });
}

function slowSinglePageServer(delayMs: number): Server & { listCalls: () => number } {
  let calls = 0;
  const lowLevel = new Server(
    { name: 'slow-single', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );
  lowLevel.setRequestHandler(ListToolsRequestSchema, async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return { tools: [] };
  });
  return Object.assign(lowLevel, { listCalls: () => calls });
}

describe('the discovery bounds (RV1808)', () => {
  it('an alternating cursor pair refuses typed with no bound configured', async () => {
    const server = alternatingCursorServer();
    const source = mcp({ transport: 'inprocess', server });
    await expect(source.tools(SESSION)).rejects.toThrow(/already visited/u);
    // Page 1 (no cursor, returns A), page 2 (A, returns B), page 3 (B,
    // returns A: A is visited, the sweep refuses).
    expect(server.listCalls()).toBe(3);
  });

  it('the whole-sweep discovery deadline fails a prompt-page crawl closed', async () => {
    const server = slowEndlessServer(25);
    const source = mcp({
      transport: 'inprocess',
      server,
      timeouts: { discoveryMs: 30 },
    });
    await expect(source.tools(SESSION)).rejects.toThrow(/discovery deadline/u);
    // Every page answered promptly (well inside any per-page bound);
    // only the whole-sweep wall clock stopped the crawl.
    expect(server.listCalls()).toBeLessThan(25);
  });

  it('a hung or slow SINGLE page pays the deadline too (RV3205)', async () => {
    // The 2026-08-11 experiment probe: the old deadline ran only
    // between pages, so an 86 ms single page sailed under a 10 ms cap
    // (the last page never re-entered the loop head). The page call
    // itself now carries the remaining discovery budget as its wire
    // timeout, so the sweep fails closed while the server still hangs.
    const server = slowSinglePageServer(2_000);
    const source = mcp({
      transport: 'inprocess',
      server,
      timeouts: { discoveryMs: 25 },
    });
    const startedAt = Date.now();
    await expect(source.tools(SESSION)).rejects.toThrow(/discovery deadline/u);
    // Cut at the remaining budget, not after the server deigned to
    // answer: two full seconds of hang never elapse.
    expect(Date.now() - startedAt).toBeLessThan(1_500);
  });

  it('a fast single page under a generous deadline is untouched (RV3205 control)', async () => {
    const server = slowSinglePageServer(5);
    const source = mcp({
      transport: 'inprocess',
      server,
      timeouts: { discoveryMs: 5_000 },
    });
    await expect(source.tools(SESSION)).resolves.toBeDefined();
    expect(server.listCalls()).toBe(1);
  });

  it('requireBounds refuses at construction naming every missing bound', () => {
    const server = pagedServer();
    expect(() => mcp({ transport: 'inprocess', server, requireBounds: true })).toThrow(
      /missing maxTools, maxPages, maxSchemaBytes, timeouts\.discoveryMs/u,
    );
    expect(() =>
      mcp({ transport: 'inprocess', server, requireBounds: true, maxTools: 8, maxPages: 4 }),
    ).toThrow(/missing maxSchemaBytes, timeouts\.discoveryMs/u);
    expect(() =>
      mcp({
        transport: 'inprocess',
        server,
        requireBounds: true,
        maxTools: 8,
        maxPages: 4,
        maxSchemaBytes: 4096,
        timeouts: { discoveryMs: 5_000 },
      }),
    ).not.toThrow();
  });

  it('discoveryMs must be a positive finite number of milliseconds', () => {
    const server = pagedServer();
    for (const discoveryMs of [0, -5, Number.NaN]) {
      expect(() => mcp({ transport: 'inprocess', server, timeouts: { discoveryMs } })).toThrow(
        /discoveryMs/u,
      );
    }
  });

  it('a finite pagination inside the deadline imports unchanged', async () => {
    const source = mcp({
      transport: 'inprocess',
      server: pagedServer(),
      timeouts: { discoveryMs: 5_000 },
    });
    const defs = await source.tools(SESSION);
    expect(defs.map((def) => def.name).sort()).toEqual(['one', 'two']);
    await source.close();
  });
});
