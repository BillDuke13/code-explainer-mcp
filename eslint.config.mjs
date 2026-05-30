import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
	{
		ignores: ['worker-configuration.d.ts', '.wrangler/**', 'node_modules/**'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			globals: {
				Request: 'readonly',
				Response: 'readonly',
				Headers: 'readonly',
				URL: 'readonly',
				fetch: 'readonly',
				console: 'readonly',
			},
		},
	},
	// Keep ESLint clear of formatting rules — Prettier owns formatting.
	prettier,
);
