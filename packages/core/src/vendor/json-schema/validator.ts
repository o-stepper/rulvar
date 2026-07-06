// Vendored from @cfworker/json-schema@4.1.1 (MIT), file src/validator.ts.
// Upstream: https://github.com/cfworker/cfworker (packages/json-schema).
// Provenance, license, supported subset, and local edits: ./README.md
// (docs/08-tools-permissions-spec.md, section "SchemaSpec"; task M0-T08).

import { dereference } from './dereference.js';
// VENDOR-EDIT: type-only imports split out for verbatimModuleSyntax.
import type { Schema, SchemaDraft, ValidationResult } from './types.js';
import { validate } from './validate.js';

// VENDOR-EDIT: upstream uses constructor parameter properties, which are
// forbidden under erasableSyntaxOnly (docs/13, section "Language"); rewritten
// as explicit field declarations and assignments.
export class Validator {
  private readonly schema: Schema | boolean;
  private readonly draft: SchemaDraft;
  private readonly shortCircuit: boolean;
  private readonly lookup: ReturnType<typeof dereference>;

  constructor(
    schema: Schema | boolean,
    draft: SchemaDraft = '2019-09',
    shortCircuit = true
  ) {
    this.schema = schema;
    this.draft = draft;
    this.shortCircuit = shortCircuit;
    this.lookup = dereference(schema);
  }

  public validate(instance: any): ValidationResult {
    return validate(
      instance,
      this.schema,
      this.draft,
      this.lookup,
      this.shortCircuit
    );
  }

  public addSchema(schema: Schema, id?: string): void {
    if (id) {
      schema = { ...schema, $id: id };
    }
    dereference(schema, this.lookup);
  }
}
