/**
 * lib/sanitise.mjs
 *
 * Shared Markdown angle-bracket sanitiser for generated pages. VitePress
 * compiles Markdown through the Vue template compiler, so raw
 * `<placeholder>` text (generic parameters like `Out<S>`, placeholders
 * like `approval:<seq>`) outside code spans is parsed as an unclosed
 * element and fails the build. This pass escapes any `<...>` outside
 * fenced/inline code whose body is not a real lowercase HTML tag from
 * the allowlist. Used by sanitise-typedoc.mjs (TypeDoc output),
 * build-changelog.mjs, and sync-root-docs.mjs (mirrored Markdown).
 */

const HTML_TAG_ALLOWLIST = new Set([
  'a',
  'b',
  'br',
  'code',
  'div',
  'em',
  'hr',
  'i',
  'img',
  'kbd',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
  'video',
]);

/**
 * Replaces every `<...>` outside fenced / inline code with HTML-escaped
 * angle brackets, unless `...` looks like a real HTML tag from the
 * allowlist above.
 */
function sanitisePass(markdown) {
  // Sentinel characters used to mask code regions before the angle-
  // bracket replacement runs. Standard practice for "tokenise +
  // restore" passes; unlikely to clash with anything in real Markdown.
  const FENCE_MARK = '\u0001';
  const SPAN_MARK = '\u0002';

  // First, mask off fenced code blocks so we don't touch them.
  const fences = [];
  let masked = markdown.replace(/```[\s\S]*?(?:```|$(?![\s\S]))/g, (block) => {
    const id = fences.length;
    fences.push(block);
    return `${FENCE_MARK}FENCE${id}${FENCE_MARK}`;
  });

  // Mask inline code spans.
  const spans = [];
  masked = masked.replace(/`[^`\n]*`/g, (span) => {
    const id = spans.length;
    spans.push(span);
    return `${SPAN_MARK}SPAN${id}${SPAN_MARK}`;
  });

  masked = masked.replace(/<([^<>\n]*)>/g, (whole, inner) => {
    const trimmed = inner.trim();
    if (trimmed.length === 0) {
      return whole;
    }
    // Strip a leading `/` (closing-tag form) and any attribute payload
    // before deciding whether the body looks like a real HTML tag. The
    // raw (case-sensitive) form must already be lowercase: TSDoc prose
    // mentions generic parameters like `Out<S>` or `<U>`, which collide
    // with the single-letter HTML tags (s, u, p, b, i, a) when compared
    // case-insensitively and then fail the Vue template compiler as
    // unclosed elements.
    const rawTag = trimmed.replace(/^\//, '').split(/[\s/>]/)[0];
    const tagName = rawTag?.toLowerCase();
    if (tagName && rawTag === tagName && HTML_TAG_ALLOWLIST.has(tagName)) {
      return whole;
    }
    // Comment-style or DOCTYPE - leave alone.
    if (trimmed.startsWith('!')) {
      return whole;
    }
    // Mailto / URL forms.
    if (trimmed.includes('://') || /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(trimmed)) {
      return whole;
    }
    // Otherwise this is README placeholder text. Escape it.
    return `&lt;${inner}&gt;`;
  });

  // Restore inline spans then fences. The control-character markers
  // above are intentional masking sentinels; the regex literals below
  // intentionally include them to undo the masking pass.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional masking sentinel; see FENCE_MARK / SPAN_MARK above.
  masked = masked.replace(/\u0002SPAN(\d+)\u0002/g, (_m, id) => spans[Number(id)]);
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional masking sentinel; see FENCE_MARK / SPAN_MARK above.
  masked = masked.replace(/\u0001FENCE(\d+)\u0001/g, (_m, id) => fences[Number(id)]);

  return masked;
}

/**
 * Nested angle forms (\`Promise<Result<T>>\`, \`<<seq>>\`) need one pass per
 * nesting level: a pass escapes the innermost \`<...>\` and only then does
 * the enclosing pair become matchable. Run to a fixed point so a single
 * script invocation is idempotent - the CI freshness gate regenerates
 * and sanitises exactly once and diffs against the committed tree.
 */
function sanitise(markdown) {
  let current = markdown;
  for (let i = 0; i < 10; i++) {
    const next = sanitisePass(current);
    if (next === current) return current;
    current = next;
  }
  return current;
}

export { sanitise };
