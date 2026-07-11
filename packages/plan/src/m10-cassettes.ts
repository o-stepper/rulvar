/**
 * M10 ModelKnowledge phase-1 cassette runners (M10-T03; docs/09,
 * section 6.11; docs/05, sections 4.1 and 4.2). Same discipline as the
 * M7/M9 runners: fully offline on the scripted adapter, catalog rows
 * asserted inline, the NORMALIZED journal returned; the committed
 * fixture is the compatibility contract.
 *
 * The knowledge store here is a deterministic in-memory stub with
 * time-stable claim dates (far past and far future), so recordings
 * never age. The claims live on a DECLARED ladder of an advertised
 * profile that is never spawned: reachability comes from the
 * declaration, and the spawn mechanics stay plain.
 */
import type {
  ClaimOp,
  JournalEntry,
  KnowledgeSnapshot,
  ModelClaim,
  ModelKnowledgeStore,
} from '@rulvar/core';
import { InMemoryStore, knowledgeHash } from '@rulvar/core';

import {
  agentTypeOfRequest,
  BUDGET,
  cassetteAdapter,
  EMPTY_PLAN_HASH,
  engineWith,
  normalizeAdaptiveJournal,
  settled,
  type CassetteTurn,
} from './cassettes.js';
import { orchestratePlanned } from './plan-runner.js';

function editorialClaim(id: string, extra?: Partial<ModelClaim>): ModelClaim {
  return {
    id,
    subject: { model: 'fake:model' },
    taskClass: 'code-edit',
    polarity: 'strength',
    statement: 'lands small diffs cleanly',
    class: 'human-editorial',
    status: 'active',
    evidence: [{ kind: 'journal', runId: 'seed-run', entryRef: 3 }],
    confidence: 'high',
    // Time-stable: the recording never ages past these bounds.
    observedAt: '2026-07-01',
    expiresAt: '9999-01-01',
    author: { kind: 'human', id: 'founder' },
    ...extra,
  };
}

/** A read-only deterministic store; snapshots indexed by read ordinal. */
function stubStore(snapshots: KnowledgeSnapshot[]): ModelKnowledgeStore {
  let reads = 0;
  return {
    current(): Promise<KnowledgeSnapshot> {
      const snapshot = snapshots[Math.min(reads, snapshots.length - 1)];
      reads += 1;
      if (snapshot === undefined) {
        throw new Error('stubStore requires at least one snapshot');
      }
      return Promise.resolve(snapshot);
    },
    commit(_ops: ClaimOp[], _expectedVersion: number): Promise<number> {
      return Promise.reject(new Error('the cassette knowledge store is read-only'));
    },
  };
}

function snapshotOf(version: number, claims: ModelClaim[]): KnowledgeSnapshot {
  return { version, hash: knowledgeHash(claims), claims };
}

/**
 * The advertised profiles: 'worker' spawns plainly; 'specialist'
 * declares the ladder that makes the claim's subject reachable and is
 * never spawned.
 */
const KB_PROFILES = {
  worker: { description: 'does one task' },
  specialist: {
    description: 'ladder-declared specialist',
    model: {
      ladder: {
        rungs: [{ model: 'fake:model', maxTurns: 8, maxTokens: 4096 }],
        startTier: 0,
        escalateOn: ['error'],
      },
    },
  },
};

interface KbPinValue {
  decisionType?: string;
  version?: number;
  hash?: string;
  cardText?: string;
}

function kbEntriesOf(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter((entry) => {
    const decisionType = (entry.value as KbPinValue | undefined)?.decisionType;
    return decisionType === 'kb_pinned' || decisionType === 'kb_repinned';
  });
}

function planScenario(): (req: Parameters<typeof agentTypeOfRequest>[0]) => CassetteTurn {
  let phase = 0;
  return (req): CassetteTurn => {
    if (agentTypeOfRequest(req) === 'worker') {
      return { text: 'worker done' };
    }
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'do it' } }],
            rationale: 'one worker under a pinned card',
          },
        },
      };
    }
    if (phase === 2) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'kb pinned' } } };
  };
}

/**
 * kb-pin-replay (docs/09, 6.11): the pin at admission and the repin at
 * the wake, card bytes embedded, model names withheld.
 */
export async function runKbPinReplay(): Promise<JournalEntry[]> {
  const claims = [editorialClaim('01KBCLAIM0000000000000001')];
  const adapter = cassetteAdapter(planScenario());
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, KB_PROFILES, {
    knowledge: stubStore([snapshotOf(3, claims)]),
  });
  const handle = orchestratePlanned(engine, 'kb pin replay', { budget: BUDGET });
  await settled(handle);
  const entries = await store.load(handle.runId);

  const pins = kbEntriesOf(entries);
  if (pins.length !== 2) {
    throw new Error(`kb-pin-replay: expected pin plus repin, got ${String(pins.length)}`);
  }
  const [pin, repin] = pins as [JournalEntry, JournalEntry];
  const pinValue = pin.value as KbPinValue;
  const repinValue = repin.value as KbPinValue;
  if (pinValue.decisionType !== 'kb_pinned' || repinValue.decisionType !== 'kb_repinned') {
    throw new Error('kb-pin-replay: decisionType order is pin then repin');
  }
  if (pinValue.version !== 3 || pinValue.hash !== knowledgeHash(claims)) {
    throw new Error('kb-pin-replay: the pin embeds the snapshot version and hash');
  }
  const card = pinValue.cardText ?? '';
  if (!card.includes('lands small diffs cleanly') || !card.includes('[specialist tier 0]')) {
    throw new Error('kb-pin-replay: the card renders the note tier-relatively');
  }
  if (card.includes('fake:')) {
    throw new Error('kb-pin-replay: the orchestrator never sees model names');
  }
  const firstAgent = entries.find((entry) => entry.kind === 'agent');
  if (firstAgent === undefined || pin.seq >= firstAgent.seq) {
    throw new Error('kb-pin-replay: the pin precedes the first orchestrator agent entry');
  }
  return normalizeAdaptiveJournal(entries);
}

/**
 * kb-repin-expiry (docs/09, 6.11): the repin re-applies the docs/05
 * filters against a FRESH read; a claim the store dropped between the
 * pin and the wake stops steering, while the boot pin's bytes stand.
 */
export async function runKbRepinExpiry(): Promise<JournalEntry[]> {
  const claims = [editorialClaim('01KBCLAIM0000000000000001')];
  const dropped = [{ ...editorialClaim('01KBCLAIM0000000000000001'), status: 'archived' as const }];
  const adapter = cassetteAdapter(planScenario());
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, KB_PROFILES, {
    knowledge: stubStore([snapshotOf(3, claims), snapshotOf(4, dropped)]),
  });
  const handle = orchestratePlanned(engine, 'kb repin expiry', { budget: BUDGET });
  await settled(handle);
  const entries = await store.load(handle.runId);

  const pins = kbEntriesOf(entries);
  if (pins.length !== 2) {
    throw new Error(`kb-repin-expiry: expected pin plus repin, got ${String(pins.length)}`);
  }
  const pinValue = pins[0]?.value as KbPinValue;
  const repinValue = pins[1]?.value as KbPinValue;
  if (!(pinValue.cardText ?? '').includes('lands small diffs cleanly')) {
    throw new Error('kb-repin-expiry: the boot pin carries the note');
  }
  if ((repinValue.cardText ?? '').includes('lands small diffs cleanly')) {
    throw new Error('kb-repin-expiry: the repin must drop the archived claim');
  }
  if (repinValue.version !== 4) {
    throw new Error('kb-repin-expiry: the repin embeds the fresh snapshot version');
  }
  return normalizeAdaptiveJournal(entries);
}
