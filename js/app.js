import { loadRows } from "./fetcher.js";
import { solveSP, solveNyriSP } from "./calculator.js";
import {
  NYRI_BAU_TD,
  NYRI_EVENT_TD,
  NYRI_BIG_EVENT_CONTINUE_TARGET_PCT,
  NYRI_BIG_EVENT_NON_CONTINUE_TARGET_PCT
} from "./config.js";
import { applyFilters, getStatuses, isNyriSku } from "./filters.js";
import { renderTable } from "./ui.js";
import { exportRows } from "./exporter.js";
import { num } from "./utils.js";
import { StorageCache } from "./storage.js";

/* ---------------------------- */
/* State */
/* ---------------------------- */

let rawPricingRows = [];
let finalPricingRows = [];
let filteredPricingRows = [];
let isPricingEngineGenerated = false;

let pricingVisibleLimit = 50;
let pricingSearchTimer = null;

const pricingState = {
  mode: "BAU",
  continueTpDiff: "5",
  nonContinueTpDiff: "0",
  status: "ALL",
  search: "",
  nyriOnly: false
};

/* ---------------------------- */
/* Loader Helpers */
/* ---------------------------- */

function setLoaderStatus(text) {
  const el = document.getElementById("loaderStatusText");
  if (el) el.textContent = text;
}

function hideLoader() {
  const loader = document.getElementById("appLoader");
  if (!loader) return;
  loader.classList.add("fade-out");
  setTimeout(() => {
    loader.style.display = "none";
  }, 450);
}

function setPriceEngineLoaderStatus(text) {
  const el = document.getElementById("priceLoaderStatusText");
  if (el) el.textContent = text;
}

function showPriceEngineLoader() {
  const loader = document.getElementById("priceEngineLoader");
  if (!loader) return;
  loader.style.display = "flex";
  loader.classList.remove("fade-out");
}

function hidePriceEngineLoader() {
  const loader = document.getElementById("priceEngineLoader");
  if (!loader) return;
  loader.classList.add("fade-out");
  setTimeout(() => {
    loader.style.display = "none";
  }, 450);
}

/* ---------------------------- */
/* Cached Pricing Engine Rows */
/* ---------------------------- */

/**
 * Strict Rule: Only generate price where sku column has value, and having tp > 0.
 * If NYRI is active: only show and price SKUs starting with NYRI.
 * Else: do not show or price NYRI SKUs (nyri pricing is not in our control).
 * Results are cached locally.
 */
function getNyriModeRuleText(mode) {
  const m = String(mode || "BAU").trim().toUpperCase();
  if (m === "BAU") return `Fixed TD: ${NYRI_BAU_TD}%`;
  if (m === "EVENT") return `Fixed TD: ${NYRI_EVENT_TD}%`;
  return `Cont ${NYRI_BIG_EVENT_CONTINUE_TARGET_PCT}% / Non-Cont ${NYRI_BIG_EVENT_NON_CONTINUE_TARGET_PCT}%`;
}

function getCalculatedPricingRows(mode, continueTpDiff, nonContinueTpDiff, nyriOnly = false) {
  const cacheKey = nyriOnly
    ? `pricing_calc_nyri_${mode}`
    : `pricing_calc_${mode}_${continueTpDiff}_${nonContinueTpDiff}_std`;
  const cached = StorageCache.get(cacheKey);
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  // Filter: ONLY generate price where sku column has a value AND tp is a number, respecting NYRI toggle
  const validRows = rawPricingRows.filter(row => {
    const sku = (row.sku || row.SKU || "").trim();
    const tp = parseFloat(row.tp);
    if (!sku || isNaN(tp)) return false;

    const isNyri = isNyriSku(row);
    if (nyriOnly && !isNyri) return false;
    if (!nyriOnly && isNyri) return false;

    return true;
  });

  const computed = validRows.map(row => {
    const tp = num(row.tp);
    const mrp = num(row.mrp || row.MRP || row.mcp || row.MCP);
    const erp_sku = (row.erp_sku || "").trim();
    const sku = (row.sku || row.SKU || "").trim();
    const product_id = (row["Product Id"] || row["Product ID"] || row.product_id || row.PRODUCT_ID || row.ProductId || "").trim();
    const channel_sku = (row.channel_sku || row.CHANNEL_SKU || "").trim();
    const brand = (row.Brand || row.brand || row.BRAND || "").trim();
    const url = (row.URL || row.url || "").trim();
    const name = (row.NAME || row.name || row["SKU Name"] || "").trim();

    const calc = nyriOnly
      ? solveNyriSP(tp, mrp, mode, row.erp_status)
      : solveSP(
          tp,
          mrp,
          mode,
          row.erp_status,
          continueTpDiff,
          nonContinueTpDiff
        );

    return {
      erp_sku,
      sku,
      product_id,
      channel_sku,
      brand,
      erp_status: row.erp_status || "",
      url,
      name,
      tp,
      mrp,
      mcp: mrp,
      ...calc
    };
  });

  StorageCache.set(cacheKey, computed);
  return computed;
}

function buildPricingRows() {
  finalPricingRows = getCalculatedPricingRows(
    pricingState.mode,
    pricingState.continueTpDiff,
    pricingState.nonContinueTpDiff,
    pricingState.nyriOnly
  );
}

/* ---------------------------- */
/* Dropdowns Population */
/* ---------------------------- */

export function updateTpDiffOptions(mode = pricingState.mode) {
  const contSelect = document.getElementById("continueTpDiffSelect");
  const nonContSelect = document.getElementById("nonContinueTpDiffSelect");
  const contLabel = document.getElementById("continueTpDiffLabel");
  const nonContLabel = document.getElementById("nonContinueTpDiffLabel");

  if (!contSelect || !nonContSelect) return;

  if (pricingState.nyriOnly) {
    const m = String(mode || "BAU").trim().toUpperCase();
    if (m === "BIG EVENT" || m === "BIG_EVENT") {
      if (contLabel) contLabel.textContent = "Continue (Nyri)";
      if (nonContLabel) nonContLabel.textContent = "Non-Continue (Nyri)";
      contSelect.innerHTML = `<option value="nyri">${NYRI_BIG_EVENT_CONTINUE_TARGET_PCT}%</option>`;
      nonContSelect.innerHTML = `<option value="nyri">${NYRI_BIG_EVENT_NON_CONTINUE_TARGET_PCT}%</option>`;
    } else {
      if (contLabel) contLabel.textContent = "Nyri Rule";
      if (nonContLabel) nonContLabel.textContent = "Nyri Commercials";
      contSelect.innerHTML = `<option value="nyri">${getNyriModeRuleText(mode)}</option>`;
      nonContSelect.innerHTML = `<option value="nyri">46% Comm · ₹30 Disp</option>`;
    }
    contSelect.disabled = true;
    nonContSelect.disabled = true;
    return;
  }

  if (contLabel) contLabel.textContent = "Continue TP Diff";
  if (nonContLabel) nonContLabel.textContent = "Non-Continue TP Diff";
  contSelect.disabled = false;
  nonContSelect.disabled = false;

  const prevCont = pricingState.continueTpDiff;
  const prevNonCont = pricingState.nonContinueTpDiff;

  if (mode === "BAU") {
    contSelect.innerHTML = `
      <option value="5">+5%</option>
      <option value="0">0%</option>
    `;
    nonContSelect.innerHTML = `
      <option value="0">0%</option>
      <option value="-10">-10%</option>
    `;
    contSelect.value = (prevCont === "5" || prevCont === "0") ? prevCont : "5";
    nonContSelect.value = (prevNonCont === "0" || prevNonCont === "-10") ? prevNonCont : "0";
  } else if (mode === "EVENT") {
    contSelect.innerHTML = `
      <option value="-10">-10%</option>
      <option value="-12">-12%</option>
    `;
    nonContSelect.innerHTML = `
      <option value="-20">-20%</option>
      <option value="-30">-30%</option>
    `;
    contSelect.value = (prevCont === "-10" || prevCont === "-12") ? prevCont : "-10";
    nonContSelect.value = (prevNonCont === "-20" || prevNonCont === "-30") ? prevNonCont : "-20";
  } else {
    // BIG EVENT mode
    contSelect.innerHTML = `
      <option value="-15">-15%</option>
    `;
    nonContSelect.innerHTML = `
      <option value="-40">-40%</option>
    `;
    contSelect.value = "-15";
    nonContSelect.value = "-40";
  }

  pricingState.continueTpDiff = contSelect.value;
  pricingState.nonContinueTpDiff = nonContSelect.value;
}

function populateDropdowns() {
  // Pricing status dropdown
  const statusEl = document.getElementById("statusSelect");
  if (statusEl) {
    const statuses = getStatuses(rawPricingRows, pricingState.nyriOnly);
    const prevStatus = pricingState.status;
    statusEl.innerHTML =
      `<option value="ALL">All Statuses</option>` +
      statuses.map(s => `<option value="${s}">${s}</option>`).join("");
    
    if (statuses.includes(prevStatus)) {
      statusEl.value = prevStatus;
    } else {
      statusEl.value = "ALL";
      pricingState.status = "ALL";
    }
  }

  // Pricing Mode TP Diff relation dropdowns
  updateTpDiffOptions(pricingState.mode);
}

/* ---------------------------- */
/* Confirmation Modal Controls */
/* ---------------------------- */

function openConfirmModal() {
  const modal = document.getElementById("confirmGenerateModal");
  if (!modal) {
    runPriceEngine(false);
    return;
  }

  const modeEl = document.getElementById("confirmModalMode");
  const contLabelEl = document.getElementById("confirmModalContinueLabel");
  const nonContLabelEl = document.getElementById("confirmModalNonContinueLabel");
  const contEl = document.getElementById("confirmModalContinue");
  const nonContEl = document.getElementById("confirmModalNonContinue");
  const nyriEl = document.getElementById("confirmModalNyri");
  const skuCountEl = document.getElementById("confirmModalSkuCount");
  const noteEl = document.getElementById("confirmModalNote");

  if (modeEl) modeEl.textContent = pricingState.mode;

  if (pricingState.nyriOnly) {
    const isBigEvent = pricingState.mode === "BIG EVENT";
    if (isBigEvent) {
      if (contLabelEl) contLabelEl.textContent = "Continue TP Profit (Nyri)";
      if (nonContLabelEl) nonContLabelEl.textContent = "Non-Continue TP Profit (Nyri)";
      if (contEl) contEl.textContent = `${NYRI_BIG_EVENT_CONTINUE_TARGET_PCT}%`;
      if (nonContEl) nonContEl.textContent = `${NYRI_BIG_EVENT_NON_CONTINUE_TARGET_PCT}%`;
    } else {
      if (contLabelEl) contLabelEl.textContent = "Nyri Pricing Rule";
      if (nonContLabelEl) nonContLabelEl.textContent = "Nyri Commercials";
      if (contEl) contEl.textContent = getNyriModeRuleText(pricingState.mode);
      if (nonContEl) nonContEl.textContent = "46% Comm · 0.5% TCS · ₹30 Disp";
    }
    if (nyriEl) {
      nyriEl.textContent = "NYRI Brand Logic";
      nyriEl.className = "confirm-value font-bold text-pink";
    }
    if (noteEl) {
      noteEl.textContent = isBigEvent
        ? `Nyri Big Event solves SP to target ${NYRI_BIG_EVENT_CONTINUE_TARGET_PCT}% TP Profit % for Continue and ${NYRI_BIG_EVENT_NON_CONTINUE_TARGET_PCT}% for Non-Continue (46% commission + 18% GST, 0.5% TCS on 5% taxable value, ₹30 dispatch) and derives rounded TD%.`
        : `Nyri ${pricingState.mode} applies a fixed ${pricingState.mode === "BAU" ? NYRI_BAU_TD : NYRI_EVENT_TD}% TD on MRP and calculates commercials (46% commission + 18% GST, 0.5% TCS, ₹30 dispatch).`;
    }
  } else {
    const contVal = parseFloat(pricingState.continueTpDiff);
    const nonContVal = parseFloat(pricingState.nonContinueTpDiff);
    if (contLabelEl) contLabelEl.textContent = "Continue TP Diff";
    if (nonContLabelEl) nonContLabelEl.textContent = "Non-Continue TP Diff";
    if (contEl) contEl.textContent = `${contVal >= 0 ? '+' : ''}${pricingState.continueTpDiff}%`;
    if (nonContEl) nonContEl.textContent = `${nonContVal >= 0 ? '+' : ''}${pricingState.nonContinueTpDiff}%`;
    if (nyriEl) {
      nyriEl.textContent = "Standard (NYRI Excluded)";
      nyriEl.className = "confirm-value font-bold";
    }
    if (noteEl) {
      noteEl.textContent = "The engine will solve optimal SP, Trade Discounts, GST, marketplace commissions, and post-CODB payouts for each SKU according to these target diffs.";
    }
  }

  if (skuCountEl) {
    const nyriOnly = Boolean(pricingState.nyriOnly);
    const validCount = rawPricingRows.filter(r => {
      const sku = (r.sku || r.SKU || "").trim();
      const tp = parseFloat(r.tp);
      if (!sku || isNaN(tp)) return false;
      const isNyri = isNyriSku(r);
      return nyriOnly ? isNyri : !isNyri;
    }).length;
    skuCountEl.textContent = `${validCount.toLocaleString()} Eligible SKUs`;
  }

  modal.style.display = "flex";
}

function closeConfirmModal() {
  const modal = document.getElementById("confirmGenerateModal");
  if (modal) modal.style.display = "none";
}

/* ---------------------------- */
/* Price Engine Trigger Runner */
/* ---------------------------- */

async function runPriceEngine(forceRefresh = false) {
  showPriceEngineLoader();
  setPriceEngineLoaderStatus("Connecting to pricing catalog...");

  try {
    if (forceRefresh) {
      StorageCache.clear();
      rawPricingRows = [];
    }

    if (!rawPricingRows || !rawPricingRows.length) {
      rawPricingRows = (await loadRows(forceRefresh)) || [];
    }

    const nyriOnly = Boolean(pricingState.nyriOnly);
    const validRows = rawPricingRows.filter(r => {
      const sku = (r.sku || r.SKU || "").trim();
      const tp = parseFloat(r.tp);
      if (!sku || isNaN(tp)) return false;
      const isNyri = isNyriSku(r);
      return nyriOnly ? isNyri : !isNyri;
    });

    setPriceEngineLoaderStatus(`Calculating SP, commissions, GST & margins across ${validRows.length.toLocaleString()} valid SKUs...`);
    
    // Allow UI frame to update loader
    await new Promise(resolve => setTimeout(resolve, 60));

    buildPricingRows();
    isPricingEngineGenerated = true;
    StorageCache.set("pricing_engine_generated", true);

    const btnText = document.getElementById("generatePricesBtnText");
    const liveDataText = document.getElementById("liveDataText");

    if (btnText) {
      btnText.textContent = "Re-Generate Prices";
    }
    if (liveDataText) {
      liveDataText.textContent = `${validRows.length.toLocaleString()} SKUs Calculated ${nyriOnly ? '(NYRI)' : ''}`;
    }

    setPriceEngineLoaderStatus("Refreshing pricing view...");
    
    populateDropdowns();
    refreshPricingTable(false);

    setPriceEngineLoaderStatus("Pricing ready!");
    setTimeout(hidePriceEngineLoader, 300);
  } catch (err) {
    console.error("Price engine execution error:", err);
    setPriceEngineLoaderStatus("Error running price engine!");
    setTimeout(hidePriceEngineLoader, 1000);
  }
}

/* ---------------------------- */
/* Refresh Table */
/* ---------------------------- */

function refreshPricingTable(recalculate = false) {
  if (isPricingEngineGenerated && rawPricingRows.length) {
    if (recalculate || !finalPricingRows || !finalPricingRows.length) {
      buildPricingRows();
    }
    filteredPricingRows = applyFilters(finalPricingRows, pricingState);
  } else {
    finalPricingRows = [];
    filteredPricingRows = [];
  }

  renderTable(filteredPricingRows, pricingVisibleLimit);

  const modeLabel = document.getElementById("modeLabel");
  if (modeLabel) {
    modeLabel.textContent = pricingState.mode;
    if (pricingState.mode === "BIG EVENT") {
      modeLabel.className = "badge badge-danger";
    } else if (pricingState.mode === "EVENT") {
      modeLabel.className = "badge badge-warning";
    } else {
      modeLabel.className = "badge badge-info";
    }
  }

  const contPillLabel = document.getElementById("continuePillLabel");
  const contLabel = document.getElementById("continueDiffLabel");
  const nonContPillLabel = document.getElementById("nonContinuePillLabel");
  const nonContLabel = document.getElementById("nonContinueDiffLabel");
  const nyriLabel = document.getElementById("nyriStatusLabel");

  if (pricingState.nyriOnly) {
    const isBigEvent = pricingState.mode === "BIG EVENT";
    if (isBigEvent) {
      if (contPillLabel) contPillLabel.textContent = "Continue:";
      if (contLabel) {
        contLabel.textContent = `${NYRI_BIG_EVENT_CONTINUE_TARGET_PCT}%`;
        contLabel.className = "badge badge-danger";
      }
      if (nonContPillLabel) nonContPillLabel.textContent = "Non-Continue:";
      if (nonContLabel) {
        nonContLabel.textContent = `${NYRI_BIG_EVENT_NON_CONTINUE_TARGET_PCT}%`;
        nonContLabel.className = "badge badge-warning";
      }
    } else {
      if (contPillLabel) contPillLabel.textContent = "Nyri Rule:";
      if (contLabel) {
        contLabel.textContent = getNyriModeRuleText(pricingState.mode);
        contLabel.className = "badge badge-info";
      }
      if (nonContPillLabel) nonContPillLabel.textContent = "Commercials:";
      if (nonContLabel) {
        nonContLabel.textContent = "Comm 46% · Disp ₹30";
        nonContLabel.className = "badge badge-neutral";
      }
    }
    if (nyriLabel) {
      nyriLabel.textContent = "NYRI LOGIC";
      nyriLabel.className = "badge badge-danger";
    }
  } else {
    if (contPillLabel) contPillLabel.textContent = "Continue:";
    if (contLabel) {
      const v = parseFloat(pricingState.continueTpDiff);
      contLabel.textContent = `${v >= 0 ? '+' : ''}${pricingState.continueTpDiff}%`;
      contLabel.className = "badge badge-success";
    }
    if (nonContPillLabel) nonContPillLabel.textContent = "Non-Continue:";
    if (nonContLabel) {
      const v = parseFloat(pricingState.nonContinueTpDiff);
      nonContLabel.textContent = `${v >= 0 ? '+' : ''}${pricingState.nonContinueTpDiff}%`;
      nonContLabel.className = "badge badge-warning";
    }
    if (nyriLabel) {
      nyriLabel.textContent = "OFF (Excluded)";
      nyriLabel.className = "badge badge-neutral";
    }
  }

  const liveDataText = document.getElementById("liveDataText");
  if (liveDataText && isPricingEngineGenerated) {
    liveDataText.textContent = `${finalPricingRows.length.toLocaleString()} SKUs Calculated ${pricingState.nyriOnly ? '(NYRI)' : ''}`;
  }
}

/* ---------------------------- */
/* Event Listeners */
/* ---------------------------- */

function bindEvents() {
  // Pricing Mode
  document.getElementById("modeSelect")?.addEventListener("change", e => {
    pricingState.mode = e.target.value;
    updateTpDiffOptions(pricingState.mode);
    pricingVisibleLimit = 50;
    refreshPricingTable(true);
  });

  // Continue TP Diff
  document.getElementById("continueTpDiffSelect")?.addEventListener("change", e => {
    pricingState.continueTpDiff = e.target.value;
    pricingVisibleLimit = 50;
    refreshPricingTable(true);
  });

  // Non-Continue TP Diff
  document.getElementById("nonContinueTpDiffSelect")?.addEventListener("change", e => {
    pricingState.nonContinueTpDiff = e.target.value;
    pricingVisibleLimit = 50;
    refreshPricingTable(true);
  });

  // Status Filter
  document.getElementById("statusSelect")?.addEventListener("change", e => {
    pricingState.status = e.target.value;
    pricingVisibleLimit = 50;
    refreshPricingTable(false);
  });

  // Search input (debounced by 150ms)
  document.getElementById("searchInput")?.addEventListener("input", e => {
    clearTimeout(pricingSearchTimer);
    pricingSearchTimer = setTimeout(() => {
      pricingState.search = e.target.value;
      pricingVisibleLimit = 50;
      refreshPricingTable(false);
    }, 150);
  });

  // NYRI Toggle Button
  const nyriBtn = document.getElementById("nyriToggleBtn");
  const nyriText = document.getElementById("nyriToggleText");

  nyriBtn?.addEventListener("click", () => {
    pricingState.nyriOnly = !pricingState.nyriOnly;
    
    if (pricingState.nyriOnly) {
      nyriBtn.classList.add("active");
      nyriBtn.setAttribute("aria-pressed", "true");
      if (nyriText) nyriText.textContent = "NYRI: ON";
    } else {
      nyriBtn.classList.remove("active");
      nyriBtn.setAttribute("aria-pressed", "false");
      if (nyriText) nyriText.textContent = "NYRI: OFF";
    }

    pricingVisibleLimit = 50;
    populateDropdowns();
    refreshPricingTable(true);
  });

  // Pagination
  document.getElementById("loadMoreBtn")?.addEventListener("click", () => {
    pricingVisibleLimit += 50;
    renderTable(filteredPricingRows, pricingVisibleLimit);
  });

  // CSV Export
  document.getElementById("exportBtn")?.addEventListener("click", () => {
    exportRows(filteredPricingRows, pricingState);
  });

  // Confirmation Modal Triggers
  document.getElementById("generatePricesBtn")?.addEventListener("click", openConfirmModal);
  document.getElementById("cancelGenerateBtn")?.addEventListener("click", closeConfirmModal);
  document.getElementById("proceedGenerateBtn")?.addEventListener("click", () => {
    closeConfirmModal();
    runPriceEngine(false);
  });

  // Close modal when clicking overlay background
  document.getElementById("confirmGenerateModal")?.addEventListener("click", e => {
    if (e.target.id === "confirmGenerateModal") {
      closeConfirmModal();
    }
  });

  document.addEventListener("click", e => {
    if (e.target.closest(".trigger-price-engine")) {
      openConfirmModal();
    }
  });

  // Topbar Refresh Live Data Button
  document.getElementById("refreshAllDataBtn")?.addEventListener("click", async () => {
    StorageCache.clear();
    const liveDataText = document.getElementById("liveDataText");
    if (liveDataText) liveDataText.textContent = "Refreshing catalog...";
    setLoaderStatus("Refreshing live pricing catalog from Google Sheets...");
    const loader = document.getElementById("appLoader");
    if (loader) {
      loader.style.display = "flex";
      loader.classList.remove("fade-out");
    }
    await init(true);
  });
}

/* ---------------------------- */
/* Init */
/* ---------------------------- */

async function init(forceRefresh = false) {
  setLoaderStatus("Connecting to live pricing catalog...");
  const liveDataText = document.getElementById("liveDataText");
  if (liveDataText) liveDataText.textContent = "Loading catalog...";

  try {
    rawPricingRows = (await loadRows(forceRefresh)) || [];

    const nyriOnly = Boolean(pricingState.nyriOnly);
    const validRows = rawPricingRows.filter(r => {
      const sku = (r.sku || r.SKU || "").trim();
      const tp = parseFloat(r.tp);
      if (!sku || isNaN(tp)) return false;
      const isNyri = isNyriSku(r);
      return nyriOnly ? isNyri : !isNyri;
    });

    if (validRows.length > 0) {
      buildPricingRows();
      isPricingEngineGenerated = true;
      StorageCache.set("pricing_engine_generated", true);

      const btnText = document.getElementById("generatePricesBtnText");
      if (btnText) {
        btnText.textContent = "Re-Generate Prices";
      }
      if (liveDataText) {
        liveDataText.textContent = `${validRows.length.toLocaleString()} SKUs Calculated`;
      }
    }

    populateDropdowns();
    if (!window.__pricingEventsBound) {
      bindEvents();
      window.__pricingEventsBound = true;
    }
    refreshPricingTable(false);

    setLoaderStatus("Ready!");
    setTimeout(hideLoader, 300);
  } catch (err) {
    console.error("Initialization error:", err);
    setLoaderStatus("Error loading pricing catalog!");
    if (liveDataText) liveDataText.textContent = "Error loading catalog";
    setTimeout(hideLoader, 1000);
  }
}

init();

