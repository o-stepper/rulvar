/**
 * profileCard (M6-T04): the one agent vocabulary both orchestration
 * modes speak (docs/06, section 9.3; docs/07, section "Orchestrator
 * toolset"). The SAME text feeds the planner prompt (mode b) and the
 * spawn_agent agentType guidance (mode c).
 *
 * The card is a PURE function of the registry and byte-stable across
 * runs: profiles render sorted by name, and only model-agnostic fields
 * appear (name, description, tool names, taskClass, escalation opt-in,
 * estCost). Models are NEVER named on the card: the orchestrator's only
 * model influence is model_hint.startTier (docs/07, 4.1).
 */
import type { AgentProfile } from '../engine/ctx.js';

function toolNamesOf(profile: AgentProfile): string[] {
  const tools = profile.tools ?? [];
  return tools.map((entry) => {
    if (typeof entry === 'string') {
      // A registered profile name whose toolset is borrowed (docs/06, 8.3).
      return `${entry} (profile toolset)`;
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
 * the planner never guesses at unregistered agentTypes.
 */
export function profileCard(profiles: Record<string, AgentProfile> | undefined): string {
  const names = Object.keys(profiles ?? {}).sort();
  if (profiles === undefined || names.length === 0) {
    return 'Agent profiles: none registered. Calls take no agentType.';
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
  return lines.join('\n');
}
