import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				// Override the wrangler.jsonc placeholder with a real secret so the fail-closed
				// guard authenticates instead of returning 503 during tests.
				miniflare: {
					bindings: { SHARED_SECRET: 'test-shared-secret' },
				},
			},
		},
	},
});
