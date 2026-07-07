import { describe, expect, it } from 'vitest';

import { DEFAULT_NO_PROGRESS_TURNS, NoProgressDetector } from './no-progress.js';

describe('NoProgressDetector (M3-T08)', () => {
  it('defaults to the committed docs/06 Appendix A value', () => {
    expect(DEFAULT_NO_PROGRESS_TURNS).toBe(3);
    const detector = new NoProgressDetector();
    detector.recordTurn({ toolCalls: 0 });
    detector.recordTurn({ toolCalls: 0 });
    expect(detector.tripped).toBe(false);
    detector.recordTurn({ toolCalls: 0 });
    expect(detector.tripped).toBe(true);
  });

  it('a tool call resets the streak; an artifact delta counts as progress', () => {
    const detector = new NoProgressDetector(2);
    detector.recordTurn({ toolCalls: 0 });
    detector.recordTurn({ toolCalls: 3 });
    expect(detector.streak).toBe(0);
    detector.recordTurn({ toolCalls: 0 });
    detector.recordTurn({ toolCalls: 0, artifactDeltas: 1 });
    expect(detector.streak).toBe(0);
    detector.recordTurn({ toolCalls: 0 });
    detector.recordTurn({ toolCalls: 0 });
    expect(detector.tripped).toBe(true);
  });

  it('describes the abort with streak and threshold', () => {
    const detector = new NoProgressDetector(1);
    detector.recordTurn({ toolCalls: 0 });
    expect(detector.describe()).toContain('1 consecutive turns');
    expect(detector.describe()).toContain('threshold 1');
  });
});
