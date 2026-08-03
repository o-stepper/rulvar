/**
 * MCP session posture (RV1516): the auth story and the drift story of
 * an mcp() source get named, host-owned contracts. `http.headers`
 * injects headers per REQUEST through a wrapped fetch (a hook is
 * awaited before every send, so rotating tokens need no reconnect and
 * no 401 ever needs a library-invented retry). `drift` names what a
 * listChanged notification means: 'rekey' is today's documented
 * re-keying default, 'refuse' poisons the source so every later
 * tools() refuses typed until the host deliberately close()s and
 * re-creates it. In-flight spawn snapshots stay untouched either way.
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ConfigError } from '../l0/errors.js';
import type { ToolContext } from '../l0/spi/toolsource.js';
import { mcp } from './mcp.js';

const SESSION = { runId: 'run-posture' };

function toolContext(): ToolContext {
  return {
    runId: 'run-posture',
    spanId: 'span-1',
    agent: { agentType: '' },
    cwd: process.cwd(),
    isolation: 'none',
    signal: new AbortController().signal,
    log: () => undefined,
  };
}

function fixtureServer(): McpServer {
  const server = new McpServer({ name: 'fixture', version: '1.0.0' });
  server.registerTool(
    'echo',
    { description: 'echoes the message', inputSchema: { message: z.string() } },
    ({ message }) => ({ content: [{ type: 'text', text: `echo: ${message}` }] }),
  );
  return server;
}

async function withHttpServer(run: (port: number, seen: string[]) => Promise<void>): Promise<void> {
  const seen: string[] = [];
  const httpServer = createServer((request, response) => {
    seen.push(String(request.headers.authorization ?? ''));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    void fixtureServer()
      .connect(transport)
      .then(() => transport.handleRequest(request, response))
      .catch(() => {
        response.writeHead(500).end();
      });
  });
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address() as AddressInfo;
  try {
    await run(port, seen);
  } finally {
    httpServer.closeAllConnections();
    await new Promise((resolve) => httpServer.close(resolve));
  }
}

describe('mcp posture config validation (RV1516)', () => {
  const server = new McpServer({ name: 'x', version: '1.0.0' });
  it('http is a streamable-http key: other transports refuse it typed', () => {
    expect(() => mcp({ transport: 'inprocess', server, http: { headers: { a: 'b' } } })).toThrow(
      ConfigError,
    );
    expect(() => mcp({ transport: 'stdio', command: 'x', http: { headers: { a: 'b' } } })).toThrow(
      /http/u,
    );
  });
  it('an unknown drift literal refuses typed, naming both accepted values', () => {
    expect(() =>
      mcp({ transport: 'inprocess', server, drift: 'freeze' as unknown as 'rekey' }),
    ).toThrow(/'rekey' or 'refuse'/u);
  });
});

describe('per-request auth headers (RV1516)', () => {
  it('static headers reach every wire request', async () => {
    await withHttpServer(async (port, seen) => {
      const source = mcp({
        transport: 'streamable-http',
        url: `http://127.0.0.1:${String(port)}/mcp`,
        http: { headers: { authorization: 'Bearer static-one' } },
      });
      try {
        const defs = await source.tools(SESSION);
        expect(defs.map((def) => def.name)).toEqual(['echo']);
        expect(seen.length).toBeGreaterThan(0);
        expect(new Set(seen)).toEqual(new Set(['Bearer static-one']));
      } finally {
        await source.close();
      }
    });
  }, 15000);

  it('a hook is awaited per request, so a rotated token reaches the wire without reconnect', async () => {
    await withHttpServer(async (port, seen) => {
      let serial = 0;
      const source = mcp({
        transport: 'streamable-http',
        url: `http://127.0.0.1:${String(port)}/mcp`,
        http: {
          headers: () => {
            serial += 1;
            return Promise.resolve({ authorization: `Bearer rotating-${serial}` });
          },
        },
      });
      try {
        const defs = await source.tools(SESSION);
        const echo = defs.find((def) => def.name === 'echo');
        await expect(echo?.execute({ message: 'hi' }, toolContext())).resolves.toBe('echo: hi');
        const distinct = new Set(seen.filter((value) => value !== ''));
        // Handshake, list, and call each consulted the hook afresh.
        expect(distinct.size).toBeGreaterThanOrEqual(2);
        expect([...distinct].every((value) => value.startsWith('Bearer rotating-'))).toBe(true);
      } finally {
        await source.close();
      }
    });
  }, 15000);
});

describe('the drift policy (RV1516)', () => {
  function mutableServer(): { lowLevel: Server; grow: () => Promise<void> } {
    const lowLevel = new Server(
      { name: 'mutable', version: '1.0.0' },
      { capabilities: { tools: { listChanged: true } } },
    );
    let tools = [{ name: 'alpha', description: 'a', inputSchema: { type: 'object' as const } }];
    lowLevel.setRequestHandler(ListToolsRequestSchema, () => ({ tools }));
    return {
      lowLevel,
      grow: async () => {
        tools = [
          ...tools,
          { name: 'beta', description: 'b', inputSchema: { type: 'object' as const } },
        ];
        await lowLevel.sendToolListChanged();
      },
    };
  }

  it("'refuse' poisons the source after a listChanged: tools() refuses typed until close()", async () => {
    const { lowLevel, grow } = mutableServer();
    const source = mcp({ transport: 'inprocess', server: lowLevel, drift: 'refuse' });
    const first = await source.tools(SESSION);
    expect(first.map((def) => def.name)).toEqual(['alpha']);
    await grow();
    await expect(source.tools(SESSION)).rejects.toThrow(ConfigError);
    await expect(source.tools(SESSION)).rejects.toThrow(/drift policy 'refuse'/u);
    // The poison holds until the host deliberately resets the source.
    await source.close();
    const fresh = await source.tools(SESSION);
    expect(fresh.map((def) => def.name).sort()).toEqual(['alpha', 'beta']);
  });

  it("an explicit 'rekey' keeps the documented re-keying default", async () => {
    const { lowLevel, grow } = mutableServer();
    const source = mcp({ transport: 'inprocess', server: lowLevel, drift: 'rekey' });
    expect((await source.tools(SESSION)).map((def) => def.name)).toEqual(['alpha']);
    await grow();
    expect((await source.tools(SESSION)).map((def) => def.name).sort()).toEqual(['alpha', 'beta']);
  });

  it('poisoning never mutates an in-flight snapshot: captured defs keep executing', async () => {
    const lowLevel = new Server(
      { name: 'live', version: '1.0.0' },
      { capabilities: { tools: { listChanged: true } } },
    );
    lowLevel.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [{ name: 'alpha', description: 'a', inputSchema: { type: 'object' as const } }],
    }));
    const { CallToolRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');
    lowLevel.setRequestHandler(CallToolRequestSchema, () => ({
      content: [{ type: 'text' as const, text: 'still-live' }],
    }));
    const source = mcp({ transport: 'inprocess', server: lowLevel, drift: 'refuse' });
    const defs = await source.tools(SESSION);
    await lowLevel.sendToolListChanged();
    await expect(source.tools(SESSION)).rejects.toThrow(/drift policy 'refuse'/u);
    await expect(defs[0]?.execute({}, toolContext())).resolves.toBe('still-live');
  });
});
