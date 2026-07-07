import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
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
    // The first spawn's snapshot and hash are untouched (docs/08 6.3).
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
