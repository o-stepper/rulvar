/**
 * profileCard (M6-T04): the one agent vocabulary both orchestration
 * modes speak. The SAME text feeds the planner prompt (mode b) and the
 * spawn_agent agentType guidance (mode c).
 *
 * The card is a PURE function of the registry and byte-stable across
 * runs: profiles render sorted by name, and only model-agnostic fields
 * appear (name, description, tool names, taskClass, escalation opt-in,
 * estCost). Models are NEVER named on the card: the orchestrator's only
 * model influence is model_hint.startTier.
 */
import type { ToolsOption } from '../tools/toolset-hash.js';
import type { AgentProfile } from '../engine/ctx.js';

function toolNamesOf(profile: AgentProfile): string[] {
  const tools = profile.tools ?? [];
  return tools.map((entry) => {
    if (typeof entry === 'string') {
      // A registered toolset name from defaults.toolsets.
      return `${entry} (registered toolset)`;
    }
    if ('kind' in entry && entry.kind === 'tool') {
      return entry.name;
    }
    // A ToolSource resolves at spawn time; the card names the source.
    return `${(entry as { id: string }).id}:* (tool source)`;
  });
}

/**
 * Renders the registry into the shared agent vocabulary card. Sorted,
 * deterministic, byte-stable; an empty registry renders explicitly so
 * the planner never guesses at unregistered agentTypes. When the engine
 * registers toolsets, their names render as a closing line (v1.17.0
 * review P1-3): those are the ONLY values valid as string entries of a
 * tools option, so the planner never invents a registry name.
 */
export function profileCard(
  profiles: Record<string, AgentProfile> | undefined,
  toolsets?: Record<string, ToolsOption>,
): string {
  const toolsetNames = Object.keys(toolsets ?? {}).sort();
  const toolsetsLine =
    toolsetNames.length === 0
      ? undefined
      : `Registered toolsets (valid string entries of a tools option): ${toolsetNames.join(', ')}.`;
  const names = Object.keys(profiles ?? {}).sort();
  if (profiles === undefined || names.length === 0) {
    const empty = 'Agent profiles: none registered. Calls take no agentType.';
    return toolsetsLine === undefined ? empty : `${empty}\n${toolsetsLine}`;
  }
  const lines: string[] = ['Agent profiles (agentType values):'];
  for (const name of names) {
    const profile = profiles[name];
    const description = profile.description ?? 'no description';
    lines.push(`- ${name}: ${description}`);
    const toolNames = toolNamesOf(profile);
    if (toolNames.length > 0) {
      lines.push(`  tools: ${toolNames.join(', ')}`);
    }
    if (profile.taskClass !== undefined) {
      lines.push(`  taskClass: ${profile.taskClass}`);
    }
    if (profile.estCost !== undefined) {
      lines.push(`  estCost: ${profile.estCost.toFixed(2)} USD`);
    }
    if (profile.escalation !== undefined) {
      lines.push(`  escalation: flavor ${profile.escalation.flavor ?? 'A'} (opt-in)`);
    }
  }
  if (toolsetsLine !== undefined) {
    lines.push(toolsetsLine);
  }
  return lines.join('\n');
}
