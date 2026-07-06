// Root flat config (docs/13, section "Committed toolchain"): ESLint 9 plus
// typescript-eslint v8 with projectService, recommendedTypeChecked. One config
// covers all packages; Prettier owns formatting and is not duplicated here.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**', 'coverage/**', 'dts-rollup/**'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // An underscore prefix marks a deliberately unused binding: SPI
      // signatures keep their full parameter lists (docs/02 interfaces)
      // even where an M1 implementation does not consume every argument.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Repo rule (docs/13, section "Module format: ESM-only"): no top-level
    // await in package entry modules; it would break synchronous
    // require(esm) consumption on the Node >=22.12.0 baseline.
    files: ['packages/*/src/index.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program > ExpressionStatement > AwaitExpression',
          message: 'No top-level await in package entry modules (docs/13, ESM-only rule).',
        },
        {
          selector: 'Program > VariableDeclaration > VariableDeclarator > AwaitExpression',
          message: 'No top-level await in package entry modules (docs/13, ESM-only rule).',
        },
        {
          selector:
            'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > AwaitExpression',
          message: 'No top-level await in package entry modules (docs/13, ESM-only rule).',
        },
        {
          selector: 'Program > ForOfStatement[await=true]',
          message: 'No top-level for-await in package entry modules (docs/13, ESM-only rule).',
        },
      ],
    },
  },
  {
    // Vendored sources (docs/13, section "Dependency baseline pins") stay
    // byte-close to upstream for diffability; upstream is not written
    // against this repo's lint profile. Scoped relaxations only; the
    // vendored code still typechecks under the committed tsconfig.
    files: ['packages/core/src/vendor/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-control-regex': 'off',
      'no-self-assign': 'off',
      'prefer-const': 'off',
    },
  },
  {
    // Config files and repo scripts sit outside the per-package tsconfig
    // projects; lint them without type information.
    files: ['**/*.js', '**/*.mjs', '**/*.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        console: 'readonly',
        URL: 'readonly',
        process: 'readonly',
      },
    },
  },
);
