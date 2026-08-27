"use strict";

/* Talaan local statement parsers.
   OFX and QIF text is normalized in memory and never uploaded or persisted. */
(function importFormatsBootstrap() {
  const VERSION = 1;
  const MAX_ROWS = 20000;
  const NORMALIZED_HEADERS = Object.freeze(["Date", "Description", "Reference", "Amount", "Type", "Category", "Payee"]);
  const NORMALIZED_MAPPING = Object.freeze({
    date:"0", description:"1", reference:"2", amount:"3", type:"4", category:"5", payee:"6",
    debit:"", credit:""
  });
  const ALLOWED_QIF_TYPES = new Set(["bank", "cash", "ccard", "oth a", "oth l"]);

  const compact = (value, limit = 500) => String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, limit);
  const cloneMapping = () => ({ ...NORMALIZED_MAPPING });

  function decodeEntities(value) {
    const named = { amp:"&", lt:"<", gt:">", quot:'"', apos:"'" };
    return String(value ?? "").replace(/&(#(?:x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos);/gi, (match, token) => {
      if (token[0] !== "#") return named[token.toLowerCase()] || match;
      const numeric = token[1]?.toLowerCase() === "x" ? Number.parseInt(token.slice(2), 16) : Number.parseInt(token.slice(1), 10);
      if (!Number.isInteger(numeric) || numeric < 0 || numeric > 0x10ffff || (numeric >= 0xd800 && numeric <= 0xdfff)) return "�";
      return String.fromCodePoint(numeric);
    });
  }

  function cleanValue(value, limit = 500) {
    return compact(decodeEntities(String(value ?? "").replace(/<[^>]*>/g, " ")), limit);
  }

  function tagValue(source, tag) {
    const escaped = String(tag).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const paired = new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}\\s*>`, "i").exec(source);
    if (paired) return cleanValue(paired[1]);
    const opened = new RegExp(`<${escaped}\\b[^>]*>`, "i").exec(source);
    if (!opened) return "";
    const remainder = source.slice(opened.index + opened[0].length);
    const boundary = remainder.search(/<\/?[A-Z][A-Z0-9_.:-]*\b[^>]*>/i);
    return cleanValue(boundary < 0 ? remainder : remainder.slice(0, boundary));
  }

  function tagBlocks(source, tag) {
    const blocks = [];
    const paired = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, "gi");
    for (const match of source.matchAll(paired)) {
      blocks.push(match[1]);
      if (blocks.length > MAX_ROWS) throw new Error(`Statement files are limited to ${MAX_ROWS.toLocaleString()} transactions.`);
    }
    if (blocks.length) return blocks;
    const pieces = source.split(new RegExp(`<${tag}\\b[^>]*>`, "i")).slice(1);
    for (const piece of pieces) {
      const boundary = piece.search(new RegExp(`<\/?(?:${tag}|BANKTRANLIST|CCSTMTRS)\\b`, "i"));
      blocks.push(boundary < 0 ? piece : piece.slice(0, boundary));
      if (blocks.length > MAX_ROWS) throw new Error(`Statement files are limited to ${MAX_ROWS.toLocaleString()} transactions.`);
    }
    return blocks;
  }

  function validIsoDate(year, month, day) {
    const value = new Date(Date.UTC(year, month - 1, day));
    if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return "";
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function normalizeOfxDate(value) {
    const match = String(value ?? "").match(/^(\d{4})(\d{2})(\d{2})/);
    return match ? validIsoDate(Number(match[1]), Number(match[2]), Number(match[3])) : "";
  }

  function normalizeQifDate(value) {
    return compact(value, 40).replace(/\s+/g, "").replace(/'/g, "/").replace(/[.-]/g, "/");
  }

  function normalizeAmount(value) {
    return compact(value, 80).replace(/[₱$€£¥\s]/g, "").replace(/^PHP/i, "").replace(/,/g, "");
  }

  function typeFromOfx(value, amount) {
    const type = compact(value, 40).toUpperCase();
    if (["XFER", "TRANSFER"].includes(type)) return "Transfer";
    if (["CREDIT", "DEP", "DIRECTDEP", "INT", "INTEREST", "DIV"].includes(type)) return "Income";
    if (["DEBIT", "ATM", "CASH", "CHECK", "DIRECTDEBIT", "PAYMENT", "FEE", "SRVCHG"].includes(type)) return "Expense";
    return Number(amount) < 0 ? "Expense" : "Income";
  }

  function parseOfx(text) {
    const source = String(text ?? "").replace(/^\uFEFF/, "");
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error("OFX document declarations and entities are not supported.");
    if (!/<OFX\b/i.test(source)) throw new Error("The file does not contain an OFX document.");
    const bankStatement = /<(?:BANKMSGSRSV1|STMTRS|BANKACCTFROM)\b/i.test(source);
    const cardStatement = /<(?:CREDITCARDMSGSRSV1|CCSTMTRS|CCACCTFROM)\b/i.test(source);
    if (!bankStatement && !cardStatement) {
      if (/<(?:INVSTMTRS|INVTRANLIST|INVESTMENTMSGSRSV1)\b/i.test(source)) throw new Error("Investment OFX statements are not supported yet.");
      throw new Error("Choose an OFX bank or credit-card statement.");
    }
    const transactionBlocks = tagBlocks(source, "STMTTRN");
    if (!transactionBlocks.length) throw new Error("The OFX statement does not contain bank transactions.");
    const currency = tagValue(source, "CURDEF").toUpperCase();
    const accountHint = tagValue(source, "ACCTID");
    const rowErrors = {};
    const rows = transactionBlocks.map((block, index) => {
      const amount = normalizeAmount(tagValue(block, "TRNAMT"));
      const name = tagValue(block, "NAME");
      const memo = tagValue(block, "MEMO");
      const description = compact(name && memo && name.toLocaleLowerCase("en-PH") !== memo.toLocaleLowerCase("en-PH") ? `${name} · ${memo}` : (name || memo), 240);
      const reference = tagValue(block, "FITID") || tagValue(block, "REFNUM") || tagValue(block, "CHECKNUM");
      const errors = [];
      if (!tagValue(block, "FITID")) errors.push("OFX transaction is missing FITID.");
      if (!normalizeOfxDate(tagValue(block, "DTPOSTED") || tagValue(block, "DTUSER"))) errors.push("OFX transaction has an invalid posting date.");
      if (errors.length) rowErrors[index] = errors;
      return [
        normalizeOfxDate(tagValue(block, "DTPOSTED") || tagValue(block, "DTUSER")),
        description,
        reference,
        amount,
        typeFromOfx(tagValue(block, "TRNTYPE"), amount),
        "",
        name || memo
      ];
    });
    return {
      format:"ofx", label:"OFX", headers:[...NORMALIZED_HEADERS], rows, mapping:cloneMapping(), rowErrors,
      metadata:{ currency, accountHint:compact(accountHint, 100), statementType:cardStatement && !bankStatement ? "Credit card" : "Bank" },
      warnings:currency && currency !== "PHP" ? [`This OFX statement uses ${currency}; Talaan does not convert currencies during import.`] : []
    };
  }

  function qifRecordValue(record, key) {
    const values = record[key];
    return Array.isArray(values) && values.length ? values.at(-1) : "";
  }

  function parseQif(text) {
    const source = String(text ?? "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    if (!/^!(?:Type:|Account\b)/im.test(source)) throw new Error("The file does not contain a QIF header.");
    const rows = [], rowErrors = {}, warnings = [];
    let section = "", accountHint = "", record = {}, unsupportedRecords = 0;
    const add = (key, value) => { (record[key] ||= []).push(cleanValue(value, key === "M" ? 240 : 160)); };
    const flush = () => {
      if (!Object.keys(record).length) return;
      if (section === "account") {
        accountHint ||= qifRecordValue(record, "N");
        record = {};
        return;
      }
      if (!ALLOWED_QIF_TYPES.has(section)) {
        unsupportedRecords += 1;
        record = {};
        return;
      }
      if (rows.length >= MAX_ROWS) throw new Error(`Statement files are limited to ${MAX_ROWS.toLocaleString()} transactions.`);
      const date = normalizeQifDate(qifRecordValue(record, "D"));
      const amount = normalizeAmount(qifRecordValue(record, "T") || qifRecordValue(record, "U"));
      const payee = qifRecordValue(record, "P");
      const memo = qifRecordValue(record, "M");
      const description = compact(payee && memo && payee.toLocaleLowerCase("en-PH") !== memo.toLocaleLowerCase("en-PH") ? `${payee} · ${memo}` : (payee || memo), 240);
      const reference = qifRecordValue(record, "N");
      const rawCategory = qifRecordValue(record, "L");
      const transfer = /^\[[^\]]+\]/.test(rawCategory);
      const openingBalance = /opening balance/i.test(`${payee} ${memo}`);
      const index = rows.length;
      const errors = [];
      if (record.S?.length || record.$?.length || record.E?.length) errors.push("Split QIF transactions are not supported yet.");
      if (errors.length) rowErrors[index] = errors;
      rows.push([
        date,
        description || (openingBalance ? "Opening balance" : ""),
        reference,
        amount,
        openingBalance ? "Ignore" : (transfer ? "Transfer" : ""),
        transfer ? "Internal transfer" : compact(rawCategory.split("/")[0], 40),
        payee
      ]);
      record = {};
    };

    for (const line of source.split("\n")) {
      if (/^!Account\s*$/i.test(line)) { flush(); section = "account"; continue; }
      const header = line.match(/^!Type:(.+)$/i);
      if (header) { flush(); section = compact(header[1], 40).toLocaleLowerCase("en-PH"); continue; }
      if (/^!Option:/i.test(line) || !line) continue;
      if (line === "^") { flush(); continue; }
      if (!section) continue;
      add(line[0], line.slice(1));
    }
    flush();
    if (!rows.length) {
      if (unsupportedRecords) throw new Error("This QIF file does not contain supported bank, cash, credit-card, asset, or liability transactions.");
      throw new Error("The QIF file does not contain transactions.");
    }
    if (unsupportedRecords) warnings.push(`${unsupportedRecords} unsupported QIF record${unsupportedRecords === 1 ? " was" : "s were"} skipped.`);
    return {
      format:"qif", label:"QIF", headers:[...NORMALIZED_HEADERS], rows, mapping:cloneMapping(), rowErrors,
      metadata:{ currency:"", accountHint:compact(accountHint, 100), statementType:"QIF" },
      warnings:["QIF does not declare a reliable currency. Confirm that the amounts are Philippine pesos before previewing.", ...warnings]
    };
  }

  function detectFormat(fileName, text = "") {
    const name = String(fileName ?? "").toLocaleLowerCase("en-PH");
    if (name.endsWith(".ofx")) return "ofx";
    if (name.endsWith(".qif")) return "qif";
    if (name.endsWith(".csv")) return "csv";
    const sample = String(text ?? "").slice(0, 4096);
    if (/OFXHEADER:|<OFX\b/i.test(sample)) return "ofx";
    if (/^!(?:Type:|Account\b)/im.test(sample)) return "qif";
    return "csv";
  }

  function parseStatement(text, options = {}) {
    const format = options.format || detectFormat(options.fileName, text);
    if (format === "ofx") return parseOfx(text);
    if (format === "qif") return parseQif(text);
    throw new Error("Use the CSV parser for CSV statements.");
  }

  globalThis.FinanceImportFormats = {
    version:VERSION,
    maxRows:MAX_ROWS,
    supportedFormats:["csv", "ofx", "qif"],
    normalizedHeaders:[...NORMALIZED_HEADERS],
    detectFormat,
    normalizeOfxDate,
    normalizeQifDate,
    parseOfx,
    parseQif,
    parseStatement
  };
})();
