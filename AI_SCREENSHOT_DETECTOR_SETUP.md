# Optional AI Screenshot Detector

The existing **Local scan** remains the default screenshot detector and keeps working without an AI API. The optional **Detect with AI / Improve with AI** action sends a screenshot only when the user explicitly chooses it.

## Architecture

- PWA: `expense-screenshot-ai.js`
- Secure endpoint: `supabase/functions/detect-payment/index.ts`
- AI provider: OpenAI Responses API
- Default model: `gpt-5.6-terra`
- Authentication: the Edge Function is called with the current Supabase user session
- API key: server-side Supabase secret only; never put it in `sync-config.js`, `index.html`, or browser storage

The AI request includes only the selected screenshot and the names of saved Finance accounts so the detector can match the payment source. It does not send account balances or the Finance database. The screenshot is not added to Finance records or Cloud Sync.

## Configure Supabase

From a Supabase CLI project linked to the same project used by `FINANCE_SYNC_CONFIG`:

```bash
supabase secrets set OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
supabase secrets set OPENAI_VISION_MODEL="gpt-5.6-terra"
supabase functions deploy detect-payment
```

Keep normal JWT verification enabled for the function. Do not deploy it with `--no-verify-jwt`.

After deployment, a signed-in Finance user can choose **Detect with AI**. If the function or API key is unavailable, the app shows an AI-specific message and **Local scan still works**.

## Local development

For local Supabase function development, provide secrets through your local Supabase environment rather than exposing them to the PWA. `.env.example` documents the required names but must never contain a real API key.
