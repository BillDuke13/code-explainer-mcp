// Types the SHARED_SECRET binding exposed via `import { env } from 'cloudflare:test'`.
// The Workers Vitest integration keys `env` off the global `Cloudflare.Env` interface.
declare namespace Cloudflare {
	interface Env {
		SHARED_SECRET: string;
	}
}
