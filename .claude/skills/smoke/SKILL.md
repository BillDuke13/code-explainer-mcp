---
name: smoke
description: Boot the local Worker and smoke-test the explainCode MCP endpoint with a sample snippet, verifying it returns a non-empty result. Use to confirm the worker still responds correctly after changes.
---

# Smoke-test the explainCode endpoint

Verify the Worker handles a real `explainCode` request end to end against the local dev server.

## Steps

1. **Resolve the secret** (never print it). Load `.dev.vars` so `$SHARED_SECRET` is set:

   ```bash
   set -a; [ -f ./.dev.vars ] && . ./.dev.vars; set +a
   ```

   The Worker fails closed: if `SHARED_SECRET` is unset or still the `YOUR_SECRET_KEY_HERE` placeholder, every request returns `503`. Stop and tell the user to put a real secret in `.dev.vars` before smoke-testing:

   ```bash
   case "${SHARED_SECRET:-}" in '' | YOUR_SECRET_KEY_HERE) echo 'Set a real SHARED_SECRET in .dev.vars first'; exit 1 ;; esac
   ```

2. **Start the dev server** if it isn't already listening on port 8787. Launch `npm run dev` in the background, then poll until the port answers (bounded to ~30s; fail if it never comes up):

   ```bash
   for _ in $(seq 1 30); do curl -sf -o /dev/null http://localhost:8787 && break; sleep 1; done
   curl -sf -o /dev/null http://localhost:8787 || { echo 'dev server did not start within 30s'; exit 1; }
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
