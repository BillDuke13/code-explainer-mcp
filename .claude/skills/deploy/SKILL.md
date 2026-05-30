---
name: deploy
description: Guarded production deploy of the Worker to Cloudflare. Verifies the SHARED_SECRET secret is configured (not the committed placeholder), then runs the docgen + wrangler deploy pipeline.
disable-model-invocation: true
---

# Deploy to Cloudflare Workers

Deploying mutates production. Run the pre-flight checks, get explicit confirmation, then deploy.

## Pre-flight

1. **Secret is set as a real secret, not the placeholder.** Check that `SHARED_SECRET` exists in the secret store:

   ```bash
   wrangler secret list
   ```

   If `SHARED_SECRET` is missing, stop and tell the user to run `wrangler secret put SHARED_SECRET` first.

2. **No real secret is committed.** Confirm `wrangler.jsonc` still has `vars.SHARED_SECRET` set to `"YOUR_SECRET_KEY_HERE"`. If it holds a real value, warn the user (it would commit a secret and override the secret store) before continuing.

3. **Working tree is clean enough to deploy** — surface anything uncommitted that would ship unexpectedly (`git status --short`).

## Deploy

4. Confirm with the user that they want to deploy to production. Wait for an explicit yes.

5. Run the pipeline:

   ```bash
   npm run deploy
   ```

   (= `workers-mcp docgen src/index.ts && wrangler deploy`)

6. Report the deployed `*.workers.dev` URL (or custom route) from the wrangler output. Offer to smoke-test it with `/smoke` pointed at the deployed URL.
