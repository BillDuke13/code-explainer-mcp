import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' },
			// Override the wrangler.jsonc placeholder with a real secret so the fail-closed
			// guard authenticates instead of returning 503 during tests.
			miniflare: {
				bindings: { SHARED_SECRET: 'test-shared-secret' },
			},
		}),
	],
});
