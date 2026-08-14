const CORS_HEADERS = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-terra";
const MAX_IMAGE_DATA_URL_CHARS = 20_000_000;
const MAX_ACCOUNTS = 40;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers:CORS_HEADERS });
}

function cleanAccounts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => String(item || "").trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, MAX_ACCOUNTS);
}

function validImageDataUrl(value: unknown) {
  if (typeof value !== "string" || !value || value.length > MAX_IMAGE_DATA_URL_CHARS) return false;
  return /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/i.test(value);
}

function responseText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string" && content.text.trim()) return content.text.trim();
    }
  }
  return "";
}

function safeOpenAiError(status: number) {
  if (status === 429) return { status:429, message:"AI detection is temporarily busy. Try again shortly." };
  if ([401, 403].includes(status)) return { status:502, message:"AI service authentication failed." };
  if (status >= 500) return { status:502, message:"AI detection service is temporarily unavailable." };
  return { status:502, message:"AI detection could not process this screenshot." };
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers:CORS_HEADERS });
  if (request.method !== "POST") return json({ error:"Method not allowed." }, 405);

  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return json({ error:"Sign in is required for AI detection." }, 401);

  const apiKey = String(Deno.env.get("OPENAI_API_KEY") || "").trim();
  const model = String(Deno.env.get("OPENAI_VISION_MODEL") || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  if (!apiKey) return json({ error:"AI detection is not configured yet." }, 503);

  let body: any;
  try { body = await request.json(); }
  catch { return json({ error:"Invalid request body." }, 400); }

  const image = body?.image;
  if (!validImageDataUrl(image)) return json({ error:"Use a PNG, JPEG, or WebP screenshot within the supported size limit." }, 400);
  const accounts = cleanAccounts(body?.accounts);
  const accountList = accounts.length ? accounts.map(name => `- ${name}`).join("\n") : "- No saved account names were supplied";

  const prompt = `Analyze this payment or transaction screenshot for a personal finance expense form.\n\nReturn only the structured fields requested by the schema. Never guess.\n\nRules:\n- name: merchant, recipient, biller, or payee. Do not use the bank/e-wallet/app heading as the name unless it is clearly the merchant.\n- amount: the amount actually paid or transferred. Do not use wallet/account balance, available balance, credit limit, reward points, change, service fee, or other secondary figures.\n- institution: the source bank/e-wallet/payment app used to make the payment when visible.\n- matched_account: choose an EXACT name from the saved account list below only when the screenshot clearly corresponds to it. Otherwise return null.\n- account_last4: last four account/card digits only when clearly visible.\n- transaction_date: visible transaction date/time as concise text, or null.\n- reference_number: visible payment/reference/transaction ID, or null.\n- confidence values: 0 to 1. Use lower confidence when text is ambiguous or partially visible.\n\nSaved account names:\n${accountList}`;

  const schema = {
    type:"object",
    additionalProperties:false,
    properties:{
      name:{ type:["string", "null"] },
      amount:{ type:["number", "null"] },
      currency:{ type:["string", "null"] },
      institution:{ type:["string", "null"] },
      matched_account:{ type:["string", "null"] },
      account_last4:{ type:["string", "null"] },
      transaction_date:{ type:["string", "null"] },
      reference_number:{ type:["string", "null"] },
      confidence:{
        type:"object",
        additionalProperties:false,
        properties:{
          name:{ type:"number", minimum:0, maximum:1 },
          amount:{ type:"number", minimum:0, maximum:1 },
          account:{ type:"number", minimum:0, maximum:1 },
          date:{ type:"number", minimum:0, maximum:1 },
          reference:{ type:"number", minimum:0, maximum:1 }
        },
        required:["name", "amount", "account", "date", "reference"]
      }
    },
    required:["name", "amount", "currency", "institution", "matched_account", "account_last4", "transaction_date", "reference_number", "confidence"]
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${apiKey}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model,
        store:false,
        max_output_tokens:700,
        input:[{
          role:"user",
          content:[
            { type:"input_text", text:prompt },
            { type:"input_image", image_url:image, detail:"high" }
          ]
        }],
        text:{
          format:{
            type:"json_schema",
            name:"payment_screenshot_detection",
            description:"Structured payment details extracted from a finance screenshot.",
            strict:true,
            schema
          }
        }
      }),
      signal:controller.signal
    });

    if (!openAiResponse.ok) {
      const safe = safeOpenAiError(openAiResponse.status);
      return json({ error:safe.message }, safe.status);
    }

    const payload = await openAiResponse.json();
    const text = responseText(payload);
    if (!text) return json({ error:"AI detection returned no readable result." }, 502);
    let detection: any;
    try { detection = JSON.parse(text); }
    catch { return json({ error:"AI detection returned an invalid structured result." }, 502); }
    return json({ detection, model });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return json({ error:"AI detection timed out." }, 504);
    return json({ error:"AI detection service is temporarily unavailable." }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
