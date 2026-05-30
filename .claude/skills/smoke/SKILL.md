---
name: smoke
description: Boot the local Worker and smoke-test the explainCode MCP endpoint with a sample snippet, verifying it returns a non-empty result. Use to confirm the worker still responds correctly after changes.
---

# Smoke-test the explainCode endpoint

Verify the Worker handles a real `explainCode` request end to end against the local dev server.

## Steps

1. **Resolve the secret** (never print it). If `.dev.vars` exists, load it so `$SHARED_SECRET` is set:

   ```bash
   set -a; [ -f ./.dev.vars ] && . ./.dev.vars; set +a
   : "${SHARED_SECRET:=YOUR_SECRET_KEY_HERE}"
   ```

   The fallback matches the `wrangler.jsonc` placeholder, which `wrangler dev` uses locally.

2. **Start the dev server** if it isn't already listening on port 8787. Launch `npm run dev` in the background, then poll until the port answers (give it up to ~30s):

   ```bash
   until curl -sf -o /dev/null http://localhost:8787; do sleep 1; done
   ```

3. **Send a sample request** (use the snippet/language from CLAUDE.local.md if set):

   ```bash
   curl -sS -X POST http://localhost:8787 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $SHARED_SECRET" \
     -d '{"method":"explainCode","params":["function add(a, b) { return a + b; }","javascript"]}'
   ```

4. **Check the result**: the response must be JSON with a non-empty `result` string. Report PASS/FAIL and show the first few lines of `result`. On FAIL (non-200, missing `result`, or an `error` field), surface the status code and body.

5. **Clean up**: stop the dev server you started in step 2 (kill the background `wrangler dev` process). Do not stop a server the user already had running.
