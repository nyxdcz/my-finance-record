"use strict";

(function expenseScreenshotParserBootstrap(root) {
  const ACCOUNT_ALIAS_GROUPS = [
    { canonical:"GCash", aliases:["gcash", "g cash"] },
    { canonical:"Maya", aliases:["maya", "paymaya", "pay maya", "maya wallet", "maya bank"] },
    { canonical:"GoTyme Bank", aliases:["gotyme", "go tyme", "gotyme bank", "go tyme bank"] },
    { canonical:"UnionBank", aliases:["unionbank", "union bank", "unionbank online"] },
    { canonical:"Metrobank", aliases:["metrobank", "metro bank"] },
    { canonical:"RCBC", aliases:["rcbc", "rizal commercial banking"] },
    { canonical:"BPI", aliases:["bpi", "bank of the philippine islands"] },
    { canonical:"BDO", aliases:["bdo", "bdo unibank"] },
    { canonical:"Security Bank", aliases:["security bank"] },
    { canonical:"SeaBank", aliases:["seabank", "sea bank"] },
    { canonical:"CIMB", aliases:["cimb", "cimb bank"] },
    { canonical:"LandBank", aliases:["landbank", "land bank"] },
    { canonical:"EastWest", aliases:["eastwest", "east west", "eastwest bank"] },
    { canonical:"China Bank", aliases:["chinabank", "china bank"] },
    { canonical:"PNB", aliases:["pnb", "philippine national bank"] },
    { canonical:"GrabPay", aliases:["grabpay", "grab pay"] },
    { canonical:"ShopeePay", aliases:["shopeepay", "shopee pay"] },
    { canonical:"PayPal", aliases:["paypal", "pay pal"] },
    { canonical:"Cash", aliases:["cash"] }
  ];

  const AMOUNT_POSITIVE_WORDS = [
    "amount", "total", "paid", "payment", "purchase", "sent", "transfer amount",
    "transaction amount", "you paid", "amount paid", "total paid", "charged"
  ];
  const AMOUNT_NEGATIVE_WORDS = [
    "balance", "available", "remaining", "fee", "charge fee", "service fee", "reference",
    "ref no", "account number", "mobile", "contact", "credit limit", "minimum due", "points"
  ];
  const ACCOUNT_CONTEXT_WORDS = [
    "from", "source", "account", "wallet", "bank", "debit", "credit", "paid using",
    "payment method", "payment source", "charged to"
  ];
  const MERCHANT_LABELS = [
    "merchant", "paid to", "payment to", "recipient", "receiver", "beneficiary", "sent to",
    "transferred to", "biller", "store", "seller", "payee", "to"
  ];
  const NOISY_LINE_PATTERNS = [
    /^(?:payment|transfer|transaction|purchase)\s+(?:successful|complete|completed|confirmed|done)$/i,
    /^(?:success|successful|completed|confirmed|receipt|details|transaction details|payment details)$/i,
    /^(?:reference|reference no|reference number|ref no|transaction id|trace no|invoice no)\b/i,
    /^(?:date|time|date and time)\b/i,
    /^(?:amount|total|balance|available balance|remaining balance|service fee|fee)\s*:?$/i,
    /^(?:thank you|done|share receipt|save receipt|download receipt|back to home)$/i
  ];

  function normalizeWhitespace(value) {
    return String(value ?? "").replace(/\u00a0/g, " ").replace(/[\t ]+/g, " ").trim();
  }

  function comparable(value) {
    return normalizeWhitespace(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[’'`]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function textLines(text) {
    return String(text || "")
      .replace(/\r/g, "\n")
      .split(/\n+/)
      .map(normalizeWhitespace)
      .filter(Boolean);
  }

  function boundedConfidence(score, low = 2, high = 10) {
    if (!Number.isFinite(score) || score <= low) return "low";
    if (score >= high) return "high";
    return "medium";
  }

  function parseMoney(raw) {
    const source = String(raw || "")
      .replace(/[₱]/g, "")
      .replace(/\b(?:PHP|PH?P)\b/gi, "")
      .replace(/[,\s]/g, "")
      .replace(/[^0-9.-]/g, "");
    if (!source || !/\d/.test(source)) return null;
    const value = Number(source);
    if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000) return null;
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function amountCandidates(text) {
    const lines = textLines(text);
    const candidates = [];
    const amountRegex = /(?:₱|\bPHP\b|\bPHP?\b)?\s*((?:\d{1,3}(?:[,\s]\d{3})+|\d+)(?:\.\d{1,2})?)/gi;

    lines.forEach((line, lineIndex) => {
      const lower = comparable(line);
      const hasCurrency = /₱|\bPHP\b/i.test(line);
      let match;
      while ((match = amountRegex.exec(line)) !== null) {
        const raw = match[0];
        const value = parseMoney(raw);
        if (value === null) continue;
        let score = 0;
        if (hasCurrency || /₱|\bPHP\b/i.test(raw)) score += 5;
        if (/\.\d{1,2}\b/.test(raw)) score += 1.5;
        if (AMOUNT_POSITIVE_WORDS.some(word => lower.includes(word))) score += 7;
        if (AMOUNT_NEGATIVE_WORDS.some(word => lower.includes(word))) score -= 9;
        if (/\b(?:20\d{2}|19\d{2})\b/.test(raw) && !hasCurrency) score -= 8;
        if (/^\d{1,2}$/.test(raw.trim())) score -= 5;
        if (lineIndex < 12) score += 1;
        if (value >= 10 && value <= 1_000_000) score += 1;
        candidates.push({ value, raw:normalizeWhitespace(raw), line, lineIndex, score });
      }
      amountRegex.lastIndex = 0;
    });

    return candidates.sort((left, right) => right.score - left.score || left.lineIndex - right.lineIndex || right.value - left.value);
  }

  function detectAmount(text) {
    const candidates = amountCandidates(text);
    const best = candidates.find(candidate => candidate.score >= 1);
    if (!best) return null;
    return {
      value:best.value,
      raw:best.raw,
      line:best.line,
      confidence:boundedConfidence(best.score, 1, 10),
      score:best.score
    };
  }

  function labelValue(line, labels = MERCHANT_LABELS) {
    const source = normalizeWhitespace(line);
    const lower = comparable(source);
    for (const label of labels) {
      const normalizedLabel = comparable(label);
      if (lower === normalizedLabel) return { label, value:"" };
      if (lower.startsWith(`${normalizedLabel} `)) {
        const rawPattern = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+")}\\s*[:\\-–—]?\\s*`, "i");
        const value = normalizeWhitespace(source.replace(rawPattern, ""));
        if (value && comparable(value) !== normalizedLabel) return { label, value };
      }
      const punctuationPattern = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:\\-–—]\\s*(.+)$`, "i");
      const punctuationMatch = source.match(punctuationPattern);
      if (punctuationMatch?.[1]) return { label, value:normalizeWhitespace(punctuationMatch[1]) };
    }
    return null;
  }

  function looksLikeAmountLine(line) {
    if (/₱|\bPHP\b/i.test(line)) return true;
    const lower = comparable(line);
    return AMOUNT_POSITIVE_WORDS.some(word => lower === word || lower.startsWith(`${word} `)) && /\d/.test(line);
  }

  function looksLikeDateOrReference(line) {
    const normalized = comparable(line);
    if (/\b(?:reference|ref no|transaction id|trace no|invoice no|receipt no|account no)\b/.test(normalized)) return true;
    if (/\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/.test(line)) return true;
    if (/\b\d{1,2}[:.]\d{2}\s*(?:am|pm)?\b/i.test(line)) return true;
    if (/^[#*]?\d{8,}$/.test(line.replace(/[\s-]/g, ""))) return true;
    return false;
  }

  function isNoisyMerchantLine(line) {
    const source = normalizeWhitespace(line);
    if (!source || source.length > 90) return true;
    if (!/[A-Za-z]/.test(source)) return true;
    if (NOISY_LINE_PATTERNS.some(pattern => pattern.test(source))) return true;
    if (looksLikeAmountLine(source) || looksLikeDateOrReference(source)) return true;
    const lower = comparable(source);
    if (AMOUNT_NEGATIVE_WORDS.some(word => lower === word || lower.startsWith(`${word} `))) return true;
    return false;
  }

  function cleanMerchant(value) {
    return normalizeWhitespace(value)
      .replace(/^[•·:\-–—]+\s*/, "")
      .replace(/\s+[•·]\s+.*$/, "")
      .replace(/\s{2,}/g, " ")
      .slice(0, 90);
  }

  function detectMerchant(text) {
    const lines = textLines(text);
    for (let index = 0; index < lines.length; index += 1) {
      const labeled = labelValue(lines[index]);
      if (!labeled) continue;
      let value = cleanMerchant(labeled.value);
      if (!value) {
        for (let nextIndex = index + 1; nextIndex < Math.min(lines.length, index + 4); nextIndex += 1) {
          if (!isNoisyMerchantLine(lines[nextIndex])) {
            value = cleanMerchant(lines[nextIndex]);
            break;
          }
        }
      }
      if (value && !isNoisyMerchantLine(value)) {
        return { value, line:lines[index], confidence:"high", score:12 };
      }
    }

    const appHeaders = new Set(ACCOUNT_ALIAS_GROUPS.flatMap(group => group.aliases.map(comparable)));
    const candidates = lines.map((line, index) => {
      if (isNoisyMerchantLine(line)) return null;
      const normalized = comparable(line);
      let score = 2;
      if (index > 0 && index < 12) score += 2;
      if (/\b(?:inc|corp|store|shop|restaurant|cafe|market|mart|services|solutions|qrph|online)\b/i.test(line)) score += 2;
      if (appHeaders.has(normalized)) score -= 6;
      if (ACCOUNT_CONTEXT_WORDS.some(word => normalized.startsWith(`${word} `))) score -= 4;
      return { value:cleanMerchant(line), line, lineIndex:index, score };
    }).filter(Boolean).sort((left, right) => right.score - left.score || left.lineIndex - right.lineIndex);

    const best = candidates.find(candidate => candidate.score >= 2);
    return best ? { value:best.value, line:best.line, confidence:boundedConfidence(best.score, 1, 7), score:best.score } : null;
  }

  function aliasesForAccount(accountName) {
    const normalizedName = comparable(accountName);
    const aliases = new Set([normalizedName]);
    ACCOUNT_ALIAS_GROUPS.forEach(group => {
      const groupAliases = group.aliases.map(comparable);
      const canonical = comparable(group.canonical);
      if (normalizedName === canonical || groupAliases.some(alias => normalizedName.includes(alias) || alias.includes(normalizedName))) {
        aliases.add(canonical);
        groupAliases.forEach(alias => aliases.add(alias));
      }
    });
    return [...aliases].filter(alias => alias.length >= 3 || ["bpi","bdo","pnb"].includes(alias));
  }

  function lineHasAlias(line, alias) {
    const normalized = comparable(line);
    if (!normalized || !alias) return false;
    return normalized === alias || ` ${normalized} `.includes(` ${alias} `);
  }

  function accountScore(accountName, text) {
    const lines = textLines(text);
    const aliases = aliasesForAccount(accountName);
    let score = 0;
    let bestLine = "";
    let bestLineScore = -Infinity;

    aliases.forEach(alias => {
      lines.forEach((line, index) => {
        if (!lineHasAlias(line, alias)) return;
        const normalizedLine = comparable(line);
        let lineScore = alias === comparable(accountName) ? 8 : 6;
        if (index < 6) lineScore += 3;
        if (ACCOUNT_CONTEXT_WORDS.some(word => normalizedLine.includes(word))) lineScore += 5;
        if (MERCHANT_LABELS.some(label => normalizedLine.startsWith(`${comparable(label)} `))) lineScore -= 3;
        if (lineScore > bestLineScore) {
          bestLineScore = lineScore;
          bestLine = line;
        }
        score = Math.max(score, lineScore);
      });
    });

    return { score, line:bestLine };
  }

  function detectKnownInstitution(text) {
    const lines = textLines(text);
    let best = null;
    ACCOUNT_ALIAS_GROUPS.forEach(group => {
      group.aliases.forEach(aliasRaw => {
        const alias = comparable(aliasRaw);
        lines.forEach((line, index) => {
          if (!lineHasAlias(line, alias)) return;
          const normalizedLine = comparable(line);
          let score = 5 + (index < 6 ? 3 : 0);
          if (ACCOUNT_CONTEXT_WORDS.some(word => normalizedLine.includes(word))) score += 4;
          if (!best || score > best.score) best = { name:group.canonical, line, score };
        });
      });
    });
    return best;
  }

  function detectAccount(text, accountNames = []) {
    const names = [...new Set((Array.isArray(accountNames) ? accountNames : []).map(normalizeWhitespace).filter(Boolean))];
    const scored = names.map(name => ({ name, ...accountScore(name, text) })).sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
    const best = scored.find(item => item.score >= 6);
    if (best) return { value:best.name, line:best.line, confidence:boundedConfidence(best.score, 5, 11), score:best.score, matched:true };
    const institution = detectKnownInstitution(text);
    if (!institution) return null;
    return { value:"", hint:institution.name, line:institution.line, confidence:boundedConfidence(institution.score, 4, 10), score:institution.score, matched:false };
  }

  function applicationPlan(current = {}, detected = {}, options = {}) {
    const editing = Boolean(options.editing);
    const accountTouched = Boolean(options.accountTouched);
    const currentName = normalizeWhitespace(current.name);
    const currentAmount = normalizeWhitespace(current.amount);
    return {
      name:Boolean(detected.name) && !currentName,
      amount:Number.isFinite(Number(detected.amount)) && Number(detected.amount) > 0 && !currentAmount,
      account:Boolean(detected.account) && !editing && !accountTouched
    };
  }

  function parsePaymentScreenshot(text, accountNames = []) {
    const amount = detectAmount(text);
    const merchant = detectMerchant(text);
    const account = detectAccount(text, accountNames);
    const detected = {
      name:merchant?.value || "",
      amount:amount?.value ?? null,
      account:account?.value || "",
      accountHint:account?.hint || "",
      confidence:{
        name:merchant?.confidence || "low",
        amount:amount?.confidence || "low",
        account:account?.confidence || "low"
      }
    };
    const fieldCount = [Boolean(detected.name), Number.isFinite(detected.amount), Boolean(detected.account || detected.accountHint)].filter(Boolean).length;
    return { ...detected, fieldCount };
  }

  root.FinanceExpenseScreenshotParser = {
    normalizeWhitespace,
    comparable,
    textLines,
    parseMoney,
    amountCandidates,
    detectAmount,
    detectMerchant,
    detectAccount,
    applicationPlan,
    parsePaymentScreenshot
  };
})(typeof window !== "undefined" ? window : globalThis);
