import { describe, expect, it } from 'vitest';

import {
  agentScope,
  parallelScope,
  ParallelSiteCounter,
  pipelineScope,
  planNodeScope,
  ROOT_SCOPE,
  workflowScope,
} from './scope.js';

describe('scope-path grammar (M1-T04; docs/03 section 2)', () => {
  it('reproduces the docs/03 section 2.3 examples', () => {
    expect(ROOT_SCOPE).toBe('');
    expect(parallelScope(ROOT_SCOPE, 0, 2)).toBe('par:0:2');
    expect(pipelineScope('par:0:2', 1, 4)).toBe('par:0:2/pipe:1:4');
    expect(workflowScope(ROOT_SCOPE, 'extract-invoices', 1)).toBe('wf:extract-invoices:1');
    expect(agentScope(ROOT_SCOPE, 17)).toBe('agent:17');
    expect(planNodeScope('01JZK3TQ8R4M5N6P7Q8R9S0T1U')).toBe('plan/01JZK3TQ8R4M5N6P7Q8R9S0T1U');
  });

  it('joins nested segments with a slash', () => {
    const branch = parallelScope('wf:child:0', 3, 1);
    expect(branch).toBe('wf:child:0/par:3:1');
    expect(agentScope(branch, 9)).toBe('wf:child:0/par:3:1/agent:9');
  });

  it('allocates parallel sites per enclosing scope in execution order', () => {
    const counter = new ParallelSiteCounter();
    expect(counter.next(ROOT_SCOPE)).toBe(0);
    expect(counter.next(ROOT_SCOPE)).toBe(1);
    // A different enclosing scope has its own counter.
    expect(counter.next('par:0:0')).toBe(0);
    expect(counter.next(ROOT_SCOPE)).toBe(2);
  });
});
