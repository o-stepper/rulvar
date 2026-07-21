import { mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ConfigError } from '../l0/errors.js';
import type { ToolContext } from '../l0/spi/toolsource.js';
import type { ResolvedInvocation } from '../model/router.js';
import { scriptedAdapter } from '../engine/test-harness.js';
import { runAgent, type ToolRuntime } from '../runtime/agent-loop.js';
import { mergeUsageLimits } from '../runtime/usage-limits.js';
import { mcp } from './mcp.js';
import { resolveToolset } from './toolset-hash.js';

const SESSION = { runId: 'run-1' };

function fixtureServer(): McpServer {
  const server = new McpServer({ name: 'fixture', version: '1.0.0' });
  server.registerTool(
    'echo',
    { description: 'echoes the message', inputSchema: { message: z.string() } },
    ({ message }) => ({ content: [{ type: 'text', text: `echo: ${message}` }] }),
  );
  server.registerTool('fail', { description: 'always fails', inputSchema: {} }, () => ({
    content: [{ type: 'text', text: 'the disk is on fire' }],
    isError: true,
  }));
  server.registerTool(
    'typed',
    {
      description: 'returns structured content',
      inputSchema: { n: z.number() },
      outputSchema: { doubled: z.number() },
    },
    ({ n }) => ({
      content: [{ type: 'text', text: String(n * 2) }],
      structuredContent: { doubled: n * 2 },
    }),
  );
  server.registerTool('secret', { description: 'filtered out', inputSchema: {} }, () => ({
    content: [{ type: 'text', text: 'hidden' }],
  }));
  return server;
}

function toolContext(): ToolContext {
  return {
    runId: 'run-1',
    spanId: 'span-1',
    agent: { agentType: '' },
    cwd: process.cwd(),
    isolation: 'none',
    signal: new AbortController().signal,
    log: () => undefined,
  };
}

describe('mcp ToolSource (M3-T04)', () => {
  it('validates transport-matching config keys', () => {
    expect(() => mcp({ transport: 'stdio' })).toThrow(ConfigError);
    expect(() => mcp({ transport: 'stdio', command: 'x', url: 'http://y' })).toThrow(ConfigError);
    expect(() => mcp({ transport: 'streamable-http' })).toThrow(ConfigError);
    expect(() => mcp({ transport: 'inprocess' })).toThrow(ConfigError);
    expect(() => mcp({ transport: 'inprocess', server: fixtureServer(), command: 'x' })).toThrow(
      ConfigError,
    );
  });

  it('imports tools with JSON Schema parameters and no version field', async () => {
    const source = mcp({ transport: 'inprocess', server: fixtureServer() });
    const toolset = await resolveToolset([source], SESSION);
    const echo = toolset.contracts.find((contract) => contract.name === 'echo');
    expect(echo).toBeDefined();
    expect(echo?.version).toBeUndefined();
    expect(echo?.parameters).toMatchObject({
      type: 'object',
      properties: { message: { type: 'string' } },
    });
  });

  it('deny wins over allow; filters apply to pre-prefix names', async () => {
    const source = mcp({
      transport: 'inprocess',
      server: fixtureServer(),
      allow: ['echo', 'secret', 'fail'],
      deny: ['secret'],
      prefix: 'fx',
    });
    const toolset = await resolveToolset([source], SESSION);
    expect(toolset.tools.map((def) => def.name).sort()).toEqual(['fx_echo', 'fx_fail']);
  });

  it('maps approval and risk onto imported tools', async () => {
    const source = mcp({
      transport: 'inprocess',
      server: fixtureServer(),
      allow: ['echo', 'fail'],
      approval: { fail: true },
      risk: { echo: 'read', fail: 'destructive' },
    });
    const toolset = await resolveToolset([source], SESSION);
    const echo = toolset.tools.find((def) => def.name === 'echo');
    const fail = toolset.tools.find((def) => def.name === 'fail');
    expect(echo?.needsApproval).toBe(false);
    expect(echo?.risk).toBe('read');
    expect(fail?.needsApproval).toBe(true);
    expect(fail?.risk).toBe('destructive');
  });

  it('executes through callTool: text content concatenates, structuredContent wins', async () => {
    const source = mcp({ transport: 'inprocess', server: fixtureServer() });
    const toolset = await resolveToolset([source], SESSION);
    const echo = toolset.tools.find((def) => def.name === 'echo');
    const typed = toolset.tools.find((def) => def.name === 'typed');
    await expect(echo?.execute({ message: 'hi' }, toolContext())).resolves.toBe('echo: hi');
    await expect(typed?.execute({ n: 21 }, toolContext())).resolves.toEqual({ doubled: 42 });
  });

  it('isError maps to an error tool result through the loop, not a protocol error', async () => {
    const source = mcp({ transport: 'inprocess', server: fixtureServer() });
    const toolset = await resolveToolset([source], SESSION);
    const runtime: ToolRuntime = {
      defs: toolset.tools,
      contracts: toolset.contracts,
      contextFor: () => toolContext(),
    };
    const resolved: ResolvedInvocation = {
      ref: 'fake:model',
      adapterId: 'fake',
      model: 'model',
      canonical: { kind: 'model', model: 'fake:model' },
      scrubs: [],
    };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'fail', args: {} } } : { text: 'noted the failure' },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      tools: runtime,
    });
    expect(result.status).toBe('ok');
    const toolResult = (adapter.calls[1]?.messages ?? [])
      .filter((msg) => msg.role === 'tool')
      .flatMap((msg) => msg.parts)
      .find((part) => part.type === 'tool-result');
    expect(toolResult?.isError).toBe(true);
    expect(toolResult?.result).toEqual({ error: 'the disk is on fire' });
  });

  it('a listChanged notification refreshes SUBSEQUENT toolset snapshots only', async () => {
    const server = new McpServer({ name: 'fixture', version: '1.0.0' });
    server.registerTool('alpha', { description: 'a', inputSchema: {} }, () => ({
      content: [{ type: 'text', text: 'a' }],
    }));
    const source = mcp({ transport: 'inprocess', server });
    const first = await resolveToolset([source], SESSION);
    expect(first.tools.map((def) => def.name)).toEqual(['alpha']);

    server.registerTool('beta', { description: 'b', inputSchema: {} }, () => ({
      content: [{ type: 'text', text: 'b' }],
    }));
    server.sendToolListChanged();
    await new Promise((resolve) => setImmediate(resolve));

    const second = await resolveToolset([source], SESSION);
    expect(second.tools.map((def) => def.name).sort()).toEqual(['alpha', 'beta']);
    // The first spawn's snapshot and hash are untouched.
    expect(first.tools.map((def) => def.name)).toEqual(['alpha']);
    expect(second.hash).not.toBe(first.hash);
  });

  it('fetches tools/list with cursor pagination until exhaustion', async () => {
    const lowLevel = new Server(
      { name: 'paginated', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );
    const pageOne = [
      { name: 'one', description: 'first', inputSchema: { type: 'object' as const } },
    ];
    const pageTwo = [
      { name: 'two', description: 'second', inputSchema: { type: 'object' as const } },
    ];
    lowLevel.setRequestHandler(ListToolsRequestSchema, (request) => {
      if (request.params?.cursor === 'page-2') {
        return { tools: pageTwo };
      }
      return { tools: pageOne, nextCursor: 'page-2' };
    });
    const source = mcp({ transport: 'inprocess', server: lowLevel });
    const toolset = await resolveToolset([source], SESSION);
    expect(toolset.tools.map((def) => def.name).sort()).toEqual(['one', 'two']);
  });

  it('an imported name that stays illegal after prefixing is a ConfigError', async () => {
    const server = new McpServer({ name: 'fixture', version: '1.0.0' });
    server.registerTool('x'.repeat(64), { description: 'long', inputSchema: {} }, () => ({
      content: [{ type: 'text', text: 'x' }],
    }));
    const source = mcp({ transport: 'inprocess', server, prefix: 'p' });
    await expect(resolveToolset([source], SESSION)).rejects.toThrow(ConfigError);
  });
});

describe('mcp lifecycle (v1.33.0 review P2)', () => {
  // The stdio fixture is a runnable script, so bare specifiers would
  // not resolve from its temp directory; it imports the SDK's ESM
  // build by absolute file URL instead, derived from the CJS path the
  // test process can resolve.
  const sdkCjsEntry = createRequire(import.meta.url).resolve(
    '@modelcontextprotocol/sdk/server/stdio.js',
  );
  const sdkEsmDir = join(
    sdkCjsEntry.slice(0, sdkCjsEntry.lastIndexOf(join('dist', 'cjs'))),
    'dist',
    'esm',
  );
  const moduleUrl = (rel: string): string => pathToFileURL(join(sdkEsmDir, rel)).href;
  let fixturePath: string | undefined;
  const stdioFixture = (): string => {
    if (fixturePath !== undefined) {
      return fixturePath;
    }
    const path = join(mkdtempSync(join(tmpdir(), 'rulvar-mcp-')), 'stdio-server.mjs');
    writeFileSync(
      path,
      [
        `import { Server } from '${moduleUrl('server/index.js')}';`,
        `import { StdioServerTransport } from '${moduleUrl('server/stdio.js')}';`,
        `import { CallToolRequestSchema, ListToolsRequestSchema } from '${moduleUrl('types.js')}';`,
        '',
        "const server = new Server({ name: 'fixture', version: '1.0.0' }, {",
        '  capabilities: { tools: {} },',
        '});',
        'server.setRequestHandler(ListToolsRequestSchema, () => ({',
        '  tools: [',
        "    { name: 'double', description: 'doubles a number', inputSchema: {",
        "      type: 'object', properties: { n: { type: 'number' } }, required: ['n'] } },",
        "    { name: 'pid', description: 'reports the child pid', inputSchema: { type: 'object' } },",
        '  ],',
        '}));',
        'server.setRequestHandler(CallToolRequestSchema, (request) => {',
        "  if (request.params.name === 'pid') {",
        "    return { content: [{ type: 'text', text: String(process.pid) }] };",
        '  }',
        "  return { content: [{ type: 'text', text: String(Number(request.params.arguments?.n ?? 0) * 2) }] };",
        '});',
        'await server.connect(new StdioServerTransport());',
      ].join('\n'),
      'utf8',
    );
    fixturePath = path;
    return path;
  };
  const stdioSource = () =>
    mcp({ transport: 'stdio', command: process.execPath, args: [stdioFixture()] });
  const childPidOf = async (source: ReturnType<typeof mcp>): Promise<number> => {
    const defs = await source.tools(SESSION);
    const pid = Number(await defs.find((def) => def.name === 'pid')?.execute({}, toolContext()));
    expect(Number.isInteger(pid) && pid > 0).toBe(true);
    return pid;
  };
  /** Polls until the OS process is gone; false after three seconds. */
  const gone = async (pid: number): Promise<boolean> => {
    const deadline = Date.now() + 3000;
    for (;;) {
      try {
        process.kill(pid, 0);
      } catch {
        return true;
      }
      if (Date.now() > deadline) {
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };

  it('stdio: a real child serves tools and close() releases it', async () => {
    const source = stdioSource();
    const defs = await source.tools(SESSION);
    expect(defs.map((def) => def.name).sort()).toEqual(['double', 'pid']);
    const double = defs.find((def) => def.name === 'double');
    await expect(double?.execute({ n: 42 }, toolContext())).resolves.toBe('84');
    const pid = await childPidOf(source);
    await source.close();
    expect(await gone(pid)).toBe(true);
    // Repeated close is a noop, never an error.
    await expect(source.close()).resolves.toBeUndefined();
  }, 15000);

  it('stdio: close() resets the source, so a later tools() spawns a fresh child', async () => {
    const source = stdioSource();
    const first = await childPidOf(source);
    await source.close();
    const second = await childPidOf(source);
    expect(second).not.toBe(first);
    await source.close();
    expect(await gone(second)).toBe(true);
  }, 15000);

  it('close() before first use resolves without ever connecting', async () => {
    const source = stdioSource();
    await expect(source.close()).resolves.toBeUndefined();
  });

  it('close() after a failed connect resolves, and the failure does not stick', async () => {
    const source = mcp({
      transport: 'stdio',
      command: process.execPath,
      args: ['-e', 'process.exit(7)'],
    });
    await expect(source.tools(SESSION)).rejects.toThrow();
    await expect(source.close()).resolves.toBeUndefined();
    // A fresh attempt after close, not a cached rejection.
    await expect(source.tools(SESSION)).rejects.toThrow();
    await expect(source.close()).resolves.toBeUndefined();
  }, 15000);

  it('streamable-http: a loopback server serves tools and close() resolves', async () => {
    const httpServer = createServer((request, response) => {
      // Stateless mode: one fresh server and transport per request.
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
    const source = mcp({
      transport: 'streamable-http',
      url: `http://127.0.0.1:${String(port)}/mcp`,
    });
    try {
      const defs = await source.tools(SESSION);
      const echo = defs.find((def) => def.name === 'echo');
      await expect(echo?.execute({ message: 'hi' }, toolContext())).resolves.toBe('echo: hi');
      await source.close();
      await expect(source.close()).resolves.toBeUndefined();
    } finally {
      httpServer.closeAllConnections();
      await new Promise((resolve) => httpServer.close(resolve));
    }
  }, 15000);

  it('inprocess: close() releases the pair and a later tools() reconnects', async () => {
    const server = fixtureServer();
    const source = mcp({ transport: 'inprocess', server });
    expect((await source.tools(SESSION)).length).toBeGreaterThan(0);
    await source.close();
    expect((await source.tools(SESSION)).length).toBeGreaterThan(0);
    await source.close();
  });
});
