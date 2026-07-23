/**
 * The research progress contract (RV-210 close-out): a stock tool the
 * agent calls after every research batch to state what it has just
 * established, and the deterministic scan that turns the LAST successful
 * report into the structured terminal partial when the invocation ends
 * at a limit. The published gap: an agent that hit maxToolCalls died as
 * a bare 'limit' terminal and every fact it had collected was invisible
 * to the caller; the digest said only 'terminal status limit'.
 *
 * Determinism: the tool's result depends only on its arguments, so two
 * byte-identical reports produce byte-identical results and the
 * no-new-evidence exploration guard sees a repeated report as a
 * duplicate digest (composition, exactly like the research toolset's
 * canonical pages). The partial derives from the transcript messages,
 * live from the loop's own history and on replay from the terminal
 * checkpoint, so both sides read the same bytes.
 *
 * Public docs: https://docs.rulvar.com/guide/tools
 */
import type { Msg } from '../l0/messages.js';
import type { SchemaSpec } from '../l0/schema.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import { tool } from './tool.js';

/** The stock progress tool name the engine scans terminals for. */
export const PROGRESS_REPORT_TOOL_NAME = 'report_progress';

/**
 * One progress report: what the agent has established so far. Captured
 * as {@link AgentResult.partial} (normalized: absent arrays become
 * empty) when the invocation terminates with status 'limit'.
 */
export interface ProgressReport {
  /** New facts established, each a standalone claim line. */
  facts: string[];
  /** Evidence references backing the facts (file:line or recorded ids). */
  evidence: string[];
  /** Remaining unresolved questions. */
  questions: string[];
  /** Optional short status note. */
  note?: string;
}

const PROGRESS_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['facts'],
  properties: {
    facts: {
      type: 'array',
      items: { type: 'string' },
      description: 'New facts established since the last report; may be empty early on.',
    },
    evidence: {
      type: 'array',
      items: { type: 'string' },
      description: 'Evidence references backing the facts (file:line or recorded evidence ids).',
    },
    questions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Remaining unresolved questions.',
    },
    note: { type: 'string', description: 'Optional short status note.' },
  },
};

/**
 * The stock progress-report tool. Stateless and deterministic: the
 * result echoes the counts, so a verbatim repeated report is a
 * duplicate result digest to the exploration guards. The value is the
 * side contract: the engine captures the LAST successful call of this
 * tool as the structured terminal partial of a 'limit' invocation, so
 * an agent that reports after every batch never loses its collected
 * work to a budget expiry.
 */
export function progressReportTool(): ToolDef {
  return tool({
    name: PROGRESS_REPORT_TOOL_NAME,
    description:
      'Report research progress after every batch of tool calls: the new facts you ' +
      'established, the evidence references backing them, and the questions still open. ' +
      'If the invocation ends at a limit, your LAST report is returned to the caller as ' +
      'the structured partial result, so report before the budget runs out.',
    parameters: PROGRESS_SCHEMA,
    risk: 'read',
    execute: (input) => {
      const report = input as { facts?: unknown[]; evidence?: unknown[]; questions?: unknown[] };
      return Promise.resolve({
        recorded: true,
        facts: report.facts?.length ?? 0,
        evidence: report.evidence?.length ?? 0,
        questions: report.questions?.length ?? 0,
      });
    },
  });
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

/**
 * The deterministic terminal scan: pairs `report_progress` tool calls
 * with their SUCCESSFUL results by id (a denied or failed call never
 * counts, mirroring the exploration guard's restore) and normalizes the
 * last one into a {@link ProgressReport}. Pure over the message window
 * it is given: the live loop hands its own history, the replay path
 * hands the terminal checkpoint's messages, and a compaction naturally
 * narrows the window to what the model itself still sees.
 */
export function latestProgressReport(messages: readonly Msg[]): ProgressReport | undefined {
  const callsById = new Map<string, unknown>();
  let latest: ProgressReport | undefined;
  for (const msg of messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-call' && part.name === PROGRESS_REPORT_TOOL_NAME) {
        callsById.set(part.id, part.args);
      } else if (
        part.type === 'tool-result' &&
        part.name === PROGRESS_REPORT_TOOL_NAME &&
        part.isError !== true &&
        callsById.has(part.id)
      ) {
        const args = callsById.get(part.id);
        if (typeof args === 'object' && args !== null && !Array.isArray(args)) {
          const record = args as Record<string, unknown>;
          const report: ProgressReport = {
            facts: stringArray(record.facts),
            evidence: stringArray(record.evidence),
            questions: stringArray(record.questions),
          };
          if (typeof record.note === 'string') {
            report.note = record.note;
          }
          latest = report;
        }
      }
    }
  }
  return latest;
}
