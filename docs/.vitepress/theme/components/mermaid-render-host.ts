/**
 * Mermaid renders into an off-DOM/off-screen container and passes it as the
 * third argument to `mermaid.render`. Without that, vitepress-plugin-mermaid
 * calls `render(id, code)` → Mermaid appends temporary `#dmermaid-*` nodes to
 * `document.body`. On renderer errors those nodes are not removed, so error
 * text (and the version suffix like “11.x”) leaks at the viewport edge.
 */

import type { ExternalDiagramDefinition, MermaidConfig } from 'mermaid';
import mermaid from 'mermaid';

export async function init(externalDiagrams: ExternalDiagramDefinition[]) {
  try {
    if (mermaid.registerExternalDiagrams) {
      await mermaid.registerExternalDiagrams(externalDiagrams);
    }
  } catch (e) {
    console.error(e);
  }
}

export async function render(id: string, code: string, config: MermaidConfig): Promise<string> {
  mermaid.initialize(config);
  const host = document.createElement('div');
  host.dataset.mermaidRenderHost = '';
  host.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;margin:0;padding:0;overflow:hidden;clip-path:inset(50%);contain:strict;pointer-events:none;visibility:hidden;border:0';
  document.body.appendChild(host);
  try {
    const { svg } = await mermaid.render(id, code, host);
    return svg;
  } finally {
    host.remove();
  }
}
