"use strict";

/* My Finance Records V14.0.5 · Explicit side-by-side Cloud Sync conflict review UI. */
(function financeCloudConflictReviewBootstrap() {
  let callbacks = {};
  let bound = false;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[character]);
  }

  function fieldLabel(key) {
    return String(key || "Record").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[._-]+/g, " ").replace(/^./, character => character.toUpperCase());
  }

  function displayValue(value, deleted = false) {
    if (deleted) return "Deleted in cloud";
    if (value === undefined || value === null || value === "") return "Not set";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return new Intl.NumberFormat("en-PH", { maximumFractionDigits:2 }).format(value);
    if (typeof value === "string") return value.length > 240 ? `${value.slice(0, 237)}…` : value;
    try {
      const serialized = JSON.stringify(value);
      return serialized.length > 240 ? `${serialized.slice(0, 237)}…` : serialized;
    } catch (error) {
      return "Complex value";
    }
  }

  function same(left, right) {
    try { return JSON.stringify(left) === JSON.stringify(right); }
    catch (error) { return false; }
  }

  function comparisonRows(item) {
    const local = item?.localPayload && typeof item.localPayload === "object" ? item.localPayload : {};
    const remote = item?.remotePayload && typeof item.remotePayload === "object" ? item.remotePayload : {};
    const keys = [...new Set([...Object.keys(local), ...Object.keys(remote)])].filter(key => !same(local[key], remote[key]));
    return (keys.length ? keys : ["record"]).slice(0, 16).map(key => ({
      label:fieldLabel(key),
      local:key === "record" ? displayValue(local) : displayValue(local[key]),
      remote:key === "record" ? displayValue(remote, item?.remoteDeletedAt) : displayValue(remote[key], item?.remoteDeletedAt)
    }));
  }

  function close() {
    const dialog = document.getElementById("cloudConflictReviewDialog");
    if (dialog?.open) dialog.close();
    if (dialog) { delete dialog.dataset.keyToken; delete dialog.dataset.conflictId; }
  }

  function ensure() {
    if (typeof document.createElement !== "function" || document.getElementById("cloudConflictReviewDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "cloudConflictReviewDialog";
    dialog.className = "app-dialog dialog-utility dialog-extended cloud-conflict-review-dialog";
    dialog.setAttribute("aria-labelledby", "cloudConflictReviewTitle");
    dialog.innerHTML = `
      <div class="modal-header"><div><h3 id="cloudConflictReviewTitle">Review sync difference</h3><small id="cloudConflictReviewReason"></small></div><button class="button button-secondary button-small" data-conflict-review-action="later" type="button">Resolve later</button></div>
      <div class="modal-body">
        <p class="dialog-context-note">Compare the changed fields before choosing a version. Nothing changes until you choose one.</p>
        <div class="cloud-conflict-comparison" role="table" aria-label="This device and cloud version comparison">
          <div class="cloud-conflict-comparison-head" role="row"><strong role="columnheader">Field</strong><strong role="columnheader">This device</strong><strong role="columnheader">Cloud version</strong></div>
          <div id="cloudConflictComparisonRows"></div>
        </div>
        <p class="cloud-conflict-warning">Using this device will write its pending record over the current cloud record. Using the cloud version will discard this device’s pending record.</p>
      </div>
      <div class="modal-footer cloud-conflict-review-footer"><button class="button button-secondary dialog-secondary-leading" data-conflict-review-action="download" type="button">Download both</button><span class="footer-spacer"></span><button class="button button-secondary" data-conflict-review-action="later" type="button">Resolve later</button><button class="button button-danger" data-conflict-review-action="cloud" type="button">Use cloud version</button><button class="button button-primary" data-conflict-review-action="device" type="button">Use this device</button></div>`;
    document.body.appendChild(dialog);
  }

  function bind(nextCallbacks = {}) {
    callbacks = nextCallbacks;
    ensure();
    const dialog = document.getElementById("cloudConflictReviewDialog");
    if (!dialog || bound) return;
    bound = true;
    dialog.addEventListener("click", event => {
      const action = event.target.closest("[data-conflict-review-action]")?.dataset.conflictReviewAction;
      if (!action) return;
      if (action === "later") return close();
      if (action === "download") return callbacks.onDownload?.(dialog.dataset.conflictId);
      if (action === "cloud") callbacks.onUseCloud?.(dialog.dataset.keyToken);
      if (action === "device") callbacks.onUseDevice?.(dialog.dataset.keyToken);
      close();
    });
  }

  function open({ item, keyToken, title }) {
    ensure();
    const dialog = document.getElementById("cloudConflictReviewDialog");
    if (!item || !dialog) return;
    dialog.dataset.keyToken = keyToken;
    dialog.dataset.conflictId = item.id;
    document.getElementById("cloudConflictReviewTitle").textContent = title;
    document.getElementById("cloudConflictReviewReason").textContent = item.reason || "Both devices changed this record.";
    document.getElementById("cloudConflictComparisonRows").innerHTML = comparisonRows(item).map(row => `<div class="cloud-conflict-comparison-row" role="row"><strong role="rowheader">${escapeHtml(row.label)}</strong><span role="cell">${escapeHtml(row.local)}</span><span role="cell">${escapeHtml(row.remote)}</span></div>`).join("");
    dialog.showModal();
  }

  window.FinanceCloudConflictReview = { bind, close, ensure, open, comparisonRows };
})();
