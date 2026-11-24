import js from '@eslint/js'
import hooks from 'eslint-plugin-react-hooks'
import ts from 'typescript-eslint'

export default ts.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  { files: ['**/*.{ts,tsx}'], extends: [ts.configs.strictTypeChecked], languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }] } },
  { files: ['**/*.tsx'], plugins: { 'react-hooks': hooks }, rules: hooks.configs.recommended.rules },
  { files: ['scripts/**'], languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly', fetch: 'readonly', Buffer: 'readonly', document: 'readonly', getComputedStyle: 'readonly', NodeFilter: 'readonly' } } },
)
