[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ShellSegment

# Interface: ShellSegment

Defined in: `packages/core/dist/index.d.ts`

Argv-parsing shell matcher (M5-T06): shell
allow/ask/deny is matched through a real argv parser, never a string
prefix. The composition rule is the entire point: for a compound
command the verdict is the strictest across segments, and any
unmatched segment yields ask, never a silent allow: `npm test; rm -rf
/` MUST yield ask (or deny when rm patterns are denied) even when
`npm test` is allow-listed.

Matching algorithm (5.2):
1. Lex with a POSIX-like shell lexer: quotes and escapes honored, no
   expansion of any kind.
2. Split into segments at `;`, `&&`, `||`, `|`, `&`, and newline.
3. A segment containing command substitution ($(...) or backticks),
   process substitution, or a here-doc is unmatchable: ask, always.
4. Leading environment assignments (FOO=bar cmd) are stripped; a
   segment of only assignments is treated as unmatched.
5. Redirection operators and their targets are retained as tokens; a
   pattern that does not account for them fails to match.
6. Each segment is evaluated deny, then ask, then allow.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-argv"></a> `argv` | `string`[] | Argv tokens after lexing and env-assignment stripping. | `packages/core/dist/index.d.ts` |
| <a id="property-unmatchable"></a> `unmatchable` | `boolean` | Substitutions and here-docs make a segment unmatchable (ask). | `packages/core/dist/index.d.ts` |
