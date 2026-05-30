# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MCP (Model Context Protocol) server running as a Cloudflare Worker. It explains source code (ASCII architecture diagram, core functionality, component breakdown) using regex/pattern matching only — no LLM calls and no external runtime dependencies. All logic lives in the single file `src/index.ts`: the default `fetch` export authenticates the request and dispatches to the module-private `explainCode` function and its helpers. There is no `WorkerEntrypoint` class (see "MCP tooling" below).

## Commands

- Dev server: `npm run dev` (alias `npm start`) — `wrangler dev` on http://localhost:8787
- Deploy: `npm run deploy` — runs `workers-mcp docgen src/index.ts` then `wrangler deploy`
- Regenerate binding types: `npm run cf-typegen` (`wrangler types`) — run after changing bindings/vars in `wrangler.jsonc`; it rewrites `worker-configuration.d.ts`
- Tests: `npm test` (Vitest via `@cloudflare/vitest-pool-workers`) — the suite in `test/index.spec.ts` drives the Worker through `SELF.fetch` (GET info page, auth failures, the `explainCode` contract for JS/Python, request validation)
- Typecheck: no script — `npx tsc --noEmit` checks `src/` (root `tsconfig.json` excludes `test/`); type-check the tests with `npx tsc -p test/tsconfig.json --noEmit`
- Lint: `npm run lint` (`eslint .`); auto-fix with `npm run lint:fix`
- Format: no script — use `npx prettier --write .` (a `Write|Edit` hook in `.claude/settings.json` also formats changed files)

## MCP tooling (known discrepancy)

Despite the project name, `src/index.ts` does **not** use `workers-mcp` at runtime: it implements the endpoint directly with a default `fetch` export and a custom `{ method, params }` body, not the MCP JSON-RPC wire protocol. `workers-mcp` is still in `dependencies` and `npm run deploy` still runs `workers-mcp docgen src/index.ts` before `wrangler deploy`, but there is no `WorkerEntrypoint` class for `docgen` to derive tool schemas from. Treat the dependency and the `docgen` step as vestigial unless the Worker is rewritten onto `WorkerEntrypoint`. The function-level JSDoc in `src/index.ts` is ordinary documentation — keep it accurate, but `docgen` does not consume it today.

## Code style

Prettier config (`.prettierrc`) differs from defaults — match it:

- Tabs for indentation (not spaces)
- Single quotes
- Semicolons required
- `printWidth` 140

TypeScript is `strict` (`tsconfig.json`). ESLint uses a flat config (`eslint.config.mjs`, `typescript-eslint`); Prettier owns formatting, so keep formatting rules out of ESLint.

## Secrets

`wrangler.jsonc` ships `SHARED_SECRET` as the placeholder `"YOUR_SECRET_KEY_HERE"`. Never commit a real value there. Use `wrangler secret put SHARED_SECRET` for production, and `.dev.vars` (gitignored) for local dev. The API authenticates via `Authorization: Bearer <SHARED_SECRET>`.

## API contract

POST JSON `{ "method": "explainCode", "params": [code, language] }` with the Bearer header; the response is `{ "result": "<markdown>" }`. A GET request returns an HTML info page.

## Workflow

Solo project — work directly on `main`; no PR flow required.
