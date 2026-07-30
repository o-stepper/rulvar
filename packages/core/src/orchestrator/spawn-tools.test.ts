/**
 * The parallel_agents partial fan-out contract (RV805). The tool admits
 * children SEQUENTIALLY in submission order, so an admission refusal
 * mid-loop used to throw away the whole tool call: the model saw an
 * error, the handles of the children already started never reached it,
 * the children kept running and spending, and the natural model
 * reaction was to spawn the wave again. The refusal is now part of the
 * TYPED tool result: every started handle is returned, and `refused`
 * names the index that failed, the typed error code, and the reason,
 * so the model can await, cancel, or salvage what it already paid for.
 */
import { describe, expect, it } from 'vitest';

import { BudgetExhaustedError } from '../l0/errors.js';
import type { ToolContext } from '../l0/spi/toolsource.js';
import { buildOrchestratorTools, type SpawnAgentParams } from './spawn-tools.js';
import type { OrchestratorRuntime } from './handles.js';

const CTX = {} as ToolContext;

function runtimeRefusingAt(refuseIndex: number): {
  runtime: OrchestratorRuntime;
  spawned: SpawnAgentParams[];
} {
  const spawned: SpawnAgentParams[] = [];
  const runtime = {
    spawn: (params: SpawnAgentParams) => {
      if (spawned.length === refuseIndex) {
        throw new BudgetExhaustedError(
          `admission denied: the reserve for '${params.agentType}' does not fit the remaining budget`,
        );
      }
      spawned.push(params);
      return Promise.resolve({ handle: spawned.length });
    },
  } as unknown as OrchestratorRuntime;
  return { runtime, spawned };
}

function parallelAgentsOf(runtime: OrchestratorRuntime) {
  const tools = buildOrchestratorTools(runtime, 'profiles: worker');
  const parallel = tools.find((def) => def.name === 'parallel_agents');
  if (parallel === undefined) {
    throw new Error('parallel_agents missing from the orchestrator toolset');
  }
  return parallel;
}

const taskOf = (n: number): SpawnAgentParams => ({
  agentType: 'worker',
  prompt: `task ${String(n)}`,
});

describe('parallel_agents partial fan-out (RV805)', () => {
  it('a mid-loop admission refusal returns the started handles and names the refusal, never throws', async () => {
    const { runtime, spawned } = runtimeRefusingAt(2);
    const parallel = parallelAgentsOf(runtime);
    const result = (await parallel.execute(
      { tasks: [taskOf(1), taskOf(2), taskOf(3), taskOf(4)] },
      CTX,
    )) as {
      handles: number[];
      refused?: { index: number; code?: string; reason: string };
    };
    // The two children started BEFORE the refusal stay visible: the
    // model can await or cancel them instead of losing the wave.
    expect(result.handles).toEqual([1, 2]);
    expect(result.refused).toBeDefined();
    expect(result.refused?.index).toBe(2);
    expect(result.refused?.code).toBe('budget_exhausted');
    expect(result.refused?.reason).toContain('admission denied');
    // Nothing after the refusal was attempted: sequential semantics.
    expect(spawned).toHaveLength(2);
  });

  it('a refusal at the first task returns the same typed shape with zero handles', async () => {
    const { runtime } = runtimeRefusingAt(0);
    const parallel = parallelAgentsOf(runtime);
    const result = (await parallel.execute({ tasks: [taskOf(1), taskOf(2)] }, CTX)) as {
      handles: number[];
      refused?: { index: number; code?: string; reason: string };
    };
    expect(result.handles).toEqual([]);
    expect(result.refused?.index).toBe(0);
    expect(result.refused?.code).toBe('budget_exhausted');
  });

  it('a clean wave returns handles only, byte for byte the historical shape', async () => {
    const { runtime } = runtimeRefusingAt(99);
    const parallel = parallelAgentsOf(runtime);
    const result = await parallel.execute({ tasks: [taskOf(1), taskOf(2), taskOf(3)] }, CTX);
    expect(result).toEqual({ handles: [1, 2, 3] });
  });
});
