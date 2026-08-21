"use strict";
(function installFinanceBrandIcons(root) {
  const doc = root.document;
  if (!doc) return;

  const ensureLink = ({ rel, sizes, href, type }) => {
    let selector = `link[rel="${rel}"]`;
    if (sizes) selector += `[sizes="${sizes}"]`;
    let link = doc.head?.querySelector(selector);
    if (!link) {
      link = doc.createElement("link");
      link.rel = rel;
      if (sizes) link.sizes = sizes;
      if (type) link.type = type;
      doc.head?.appendChild(link);
    }
    if (link) link.href = href;
  };

  const installCompactExpenseCardStyles = () => {
    const id = "finance-compact-expense-cards-v15-2-19";
    if (doc.getElementById(id)) return;
    const style = doc.createElement("style");
    style.id = id;
    style.textContent = `
@media (min-width:851px) {
  html body #money .section-stack {
    align-items:start !important;
    gap:8px !important;
  }

  html body #money .period-card {
    min-width:0 !important;
    margin:0 !important;
    padding:6px !important;
    overflow:visible !important;
  }

  html body #money .period-header {
    min-height:50px !important;
    margin:0 !important;
    padding:4px 5px 6px !important;
  }

  html body #money .period-header h3 {
    font-size:.86rem !important;
  }

  html body #money .period-header p {
    margin-top:2px !important;
    font-size:.63rem !important;
  }

  html body #money .period-total {
    font-size:.88rem !important;
  }

  html body #money :is(#earlyExpenses,#lateExpenses,#otherExpenses) {
    display:grid !important;
    align-content:start !important;
    gap:5px !important;
  }

  html body #money :is(#earlyExpenses,#lateExpenses,#otherExpenses) > .record-row[data-expense-row],
  html body #money :is(#earlyExpenses,#lateExpenses,#otherExpenses) > .record-row[data-expense-row] + .record-row[data-expense-row] {
    min-height:0 !important;
    height:auto !important;
    margin:0 !important;
    padding:7px !important;
    gap:4px 8px !important;
    align-self:start !important;
    align-items:center !important;
  }

  html body #money .record-row[data-expense-row] .expense-record-title .record-title-copy > strong {
    font-size:.78rem !important;
    line-height:1.25 !important;
  }

  html body #money .record-row[data-expense-row] .expense-record-title .record-title-copy > small {
    margin-top:2px !important;
    font-size:.61rem !important;
    line-height:1.3 !important;
  }

  html body #money .record-row[data-expense-row] .expense-record-title .record-statuses {
    margin-top:3px !important;
    gap:3px !important;
  }

  html body #money .record-row[data-expense-row] > .due-cell {
    gap:2px 6px !important;
    padding-top:0 !important;
    font-size:.6rem !important;
  }

  html body #money .record-row[data-expense-row] > [data-label="Planned account"] {
    font-size:.61rem !important;
  }

  html body #money .record-row[data-expense-row] > .amount {
    font-size:.73rem !important;
  }

  html body #money .record-row[data-expense-row] > .desktop-record-actions {
    margin-top:1px !important;
    padding-top:5px !important;
    gap:4px !important;
  }

  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button {
    min-height:30px !important;
    height:30px !important;
    padding:4px 7px !important;
    border-radius:7px !important;
    font-size:.65rem !important;
  }

  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved,
  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved:hover,
  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved:focus-visible,
  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved:active,
  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved.active,
  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved.active:hover {
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
    width:auto !important;
    min-width:0 !important;
    max-width:none !important;
    height:30px !important;
    min-height:30px !important;
    padding:4px 7px !important;
    border:1px solid var(--line) !important;
    border-radius:7px !important;
    background:var(--surface) !important;
    color:var(--text) !important;
    box-shadow:none !important;
    transform:none !important;
  }

  html body #money .record-row[data-expense-row] .button-saved .saved-icon-container {
    display:none !important;
  }

  html body #money .record-row[data-expense-row] .button-saved .saved-button-text {
    display:inline !important;
    font-size:0 !important;
    line-height:1 !important;
    white-space:nowrap !important;
  }

  html body #money .record-row[data-expense-row] .button-saved .saved-button-text::after {
    content:"Repeat monthly" !important;
    font-size:.65rem !important;
    line-height:1 !important;
  }

  html body #money .record-row[data-expense-row] .button-saved.active .saved-button-text::after {
    content:"Repeats monthly" !important;
  }
}
`;
    doc.head?.appendChild(style);
  };

  ensureLink({ rel:"icon", sizes:"32x32", type:"image/png", href:"./icons/favicon-32-logo2.png" });
  ensureLink({ rel:"icon", sizes:"192x192", type:"image/png", href:"./icons/icon-192-logo2.png" });
  ensureLink({ rel:"apple-touch-icon", href:"./icons/apple-touch-icon-logo2.png" });
  installCompactExpenseCardStyles();
})(typeof window !== "undefined" ? window : globalThis);
