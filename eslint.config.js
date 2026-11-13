import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'drizzle/', 'src/public/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Config files and tests live outside src/ (and thus outside the
          // build tsconfig's include). Let the type-aware linter fall back to
          // the default project for them instead of erroring.
          allowDefaultProject: ['*.js', '*.ts', 'tests/*.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // NestJS decorators and DI rely on patterns eslint-typescript flags by
      // default; relax the ones that fight the framework without hiding real
      // bugs.
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
