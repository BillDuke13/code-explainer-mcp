# Code Explainer MCP

A Cloudflare Worker that explains source code. Given a snippet and its language, it returns a Markdown report containing an ASCII architecture diagram, a core-functionality summary, and a breakdown of the main classes and functions.

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)

Analysis runs entirely inside the Worker using regex and pattern matching — there are **no LLM calls and no external runtime dependencies**. All logic lives in a single file, [`src/index.ts`](src/index.ts).

## Features

- **Architecture diagram**: Generates an ASCII diagram showing classes (with inheritance), standalone functions, call relationships, and imported dependencies.
- **Core-functionality analysis**: Infers the primary and secondary purpose of the code (network, UI, data processing, database, authentication, testing, algorithm, file system) from weighted pattern matches.
- **Component breakdown**: Lists the main classes and functions, each with a short generated description.
- **Multi-language support**: Tailored class/function/import patterns for JavaScript, TypeScript, Python, Java, and C#, with a generic fallback for other languages.
- **Documentation extraction**: Reuses existing JSDoc, Python docstrings, and line comments when describing a component.
- **Bearer-token auth**: The POST endpoint is protected by a shared secret.

## How it works

`explainCode(code, language)` orchestrates four helpers and assembles their output into a Markdown report:

1. `generateArchitectureDiagram` — extracts classes, functions, and imports with language-specific regexes and renders an ASCII diagram, including `inherits`/`calls` relationships.
2. `extractCoreFunctionality` — counts matches across purpose categories and produces a prose summary of the primary (and secondary) purpose.
3. `extractComponents` — collects the main classes and functions; `extractBlock` finds each declaration's body by brace matching (or by indentation for Python).
4. `generateComponentDescription` — prefers an existing doc comment for each component and otherwise infers a description from code patterns.

### A note on "MCP"

The project is named for the Model Context Protocol and keeps `workers-mcp` in its deploy pipeline (`workers-mcp docgen` runs before `wrangler deploy`). However, the current `src/index.ts` does **not** use `workers-mcp` at runtime and does not implement the MCP JSON-RPC wire protocol. It serves a plain HTTP JSON endpoint with a custom `{ method, params }` body, handled directly by the Worker's default `fetch` export. Clients call it as a regular HTTP API (see [Usage](#usage)).

## Prerequisites

- [Node.js](https://nodejs.org/) 22 or higher
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/get-started/) (installed locally via `devDependencies`)
- A Cloudflare account (for deployment)

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/BillDuke13/code-explainer-mcp.git
   cd code-explainer-mcp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure the shared secret. For production, store it as a Worker secret (recommended):

   ```bash
   wrangler secret put SHARED_SECRET
   ```

   The `vars.SHARED_SECRET` entry in `wrangler.jsonc` is only the placeholder `"YOUR_SECRET_KEY_HERE"`; never commit a real secret there. The Worker **fails closed** — while the secret is unset or still the placeholder, every POST returns `503`, so a real secret must be set before the endpoint will serve. For local development, put the secret in `.dev.vars` (gitignored) instead — see [Local development](#local-development).

4. Deploy to Cloudflare Workers:

   ```bash
   npm run deploy
   ```

## Usage

### Endpoint

Send a `POST` request to your Worker URL with a JSON body:

```json
{
	"method": "explainCode",
	"params": ["your code here", "programming language"]
}
```

Include the bearer token in the `Authorization` header:

```
Authorization: Bearer <SHARED_SECRET>
```

A `GET` request to the same URL returns a small HTML info page instead of running an analysis.

### Response

On success the response is a JSON object whose `result` field holds the Markdown report:

```json
{
	"result": "# Code Analysis for javascript Code\n\n## Architecture Diagram\n...\n\n## Core Functionality\n..."
}
```

### Status codes

| Status | When                                                                           | Body                                |
| ------ | ------------------------------------------------------------------------------ | ----------------------------------- |
| `200`  | Valid POST, or a `GET`/`HEAD`                                                  | `{ "result": "<markdown>" }` / HTML |
| `401`  | POST with a missing or incorrect `Authorization` header                        | `Unauthorized`                      |
| `503`  | `SHARED_SECRET` is unset or still the placeholder (the Worker fails closed)    | `Service not configured: …`         |
| `400`  | `method` is not `explainCode`, fewer than two `params`, or non-string `params` | `Invalid method or parameters`      |
| `413`  | The code (`params[0]`) exceeds the maximum length (100,000 characters)         | `Code exceeds the maximum length …` |
| `405`  | A request method other than `POST`, `GET`, or `HEAD`                           | `Method Not Allowed`                |
| `500`  | Request body is not valid JSON, or another error occurs                        | `Error processing request`          |

### Examples

#### JavaScript (browser)

```javascript
async function explainCode(code, language) {
	const response = await fetch('https://your-worker-url.workers.dev', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer YOUR_SECRET_KEY_HERE',
		},
		body: JSON.stringify({
			method: 'explainCode',
			params: [code, language],
		}),
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data = await response.json();
	return data.result;
}

const jsCode = `function add(a, b) { return a + b; }`;
explainCode(jsCode, 'javascript')
	.then((explanation) => console.log(explanation))
	.catch((error) => console.error('Error:', error));
```

#### Python (requests)

```python
import requests


def explain_code(code, language, api_url, secret_key):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {secret_key}',
    }
    payload = {
        'method': 'explainCode',
        'params': [code, language],
    }
    response = requests.post(api_url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()['result']


code = "def hello():\n    print('Hello, world!')"
explanation = explain_code(code, 'python', 'https://your-worker-url.workers.dev', 'YOUR_SECRET_KEY_HERE')
print(explanation)
```

#### Node.js (axios)

```javascript
const axios = require('axios');

async function explainCode(code, language) {
	const response = await axios.post(
		'https://your-worker-url.workers.dev',
		{ method: 'explainCode', params: [code, language] },
		{
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer YOUR_SECRET_KEY_HERE',
			},
		},
	);
	return response.data.result;
}
```

## Local development

1. Install dependencies (`npm install`) if you have not already.

2. Provide the local secret. Create a `.dev.vars` file (gitignored) so `wrangler dev` injects it:

   ```
   SHARED_SECRET=your-local-secret
   ```

   The Worker fails closed, so `.dev.vars` must hold a real secret: with the `wrangler.jsonc` placeholder (or no secret at all), every POST returns `503`.

3. Start the dev server (http://localhost:8787):

   ```bash
   npm run dev
   ```

4. Send a request:

   ```bash
   curl -X POST http://localhost:8787 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-local-secret" \
     -d '{"method":"explainCode","params":["function hello() { return \"Hello World\"; }","javascript"]}'
   ```

### Quality checks

- **Tests** (Vitest on `@cloudflare/vitest-pool-workers`): `npm test`. The suite in `test/` drives the Worker through `SELF.fetch`, covering the GET info page, auth failures, the `explainCode` contract for JavaScript and Python, empty input, and request validation.
- **Lint** (ESLint flat config): `npm run lint`, or `npm run lint:fix` to auto-fix.
- **Type-check**: `npx tsc --noEmit` checks `src/`. The root `tsconfig.json` excludes `test/`, so type-check the tests separately with `npx tsc -p test/tsconfig.json --noEmit`.
- **Regenerate binding types**: after changing bindings or vars in `wrangler.jsonc`, run `npm run cf-typegen` to rewrite `worker-configuration.d.ts`.

Formatting is owned by Prettier (`.prettierrc`: tabs, single quotes, semicolons, `printWidth` 140) — run `npx prettier --write .`.

## Project layout

```
src/index.ts        Worker entry point and all analysis logic
test/index.spec.ts  Vitest suite exercising the HTTP contract
docs/index.html     Browsable HTML documentation
wrangler.jsonc      Worker configuration
```

## Documentation

Detailed, browsable documentation lives in [`docs/index.html`](docs/index.html) — open it in a browser for the architecture overview, the analysis pipeline, the full API reference, and known limitations.

## Security

- The POST endpoint is protected by `Authorization: Bearer <SHARED_SECRET>`.
- The Worker fails closed: it returns `503` until `SHARED_SECRET` is set to a real value (not the placeholder), so a misconfigured deploy refuses requests instead of accepting the public default.
- Store the secret with `wrangler secret put SHARED_SECRET` for production and in `.dev.vars` for local development; never commit a real value to `wrangler.jsonc`.
- The token is checked by comparing SHA-256 digests in constant time, leaking neither the secret's content nor its length through response timing. For higher-assurance deployments, add rate limiting in front of the Worker.
- Request size is bounded: oversized bodies are rejected with `413` (via `Content-Length`), and code longer than 100,000 characters is rejected before any analysis runs.

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.
