import { loadRows } from "./fetcher.js";
import { solveSP } from "./calculator.js";
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
function getCalculatedPricingRows(mode, continueTpDiff, nonContinueTpDiff, nyriOnly = false) {
  const cacheKey = `pricing_calc_${mode}_${continueTpDiff}_${nonContinueTpDiff}_${nyriOnly ? 'nyri' : 'std'}`;
  const cached = StorageCache.get(cacheKey);
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  // Filter: ONLY generate price where sku identifier exists AND tp is a number, respecting NYRI toggle
  const validRows = rawPricingRows.filter(row => {
    const sku = (row.sku || row.SKU || row.erp_sku || "").trim();
    const tp = parseFloat(row.tp);
    if (!sku || isNaN(tp)) return false;

    const isNyri = isNyriSku(row);
    if (nyriOnly && !isNyri) return false;
    if (!nyriOnly && isNyri) return false;

    return true;
  });

  const computed = validRows.map(row => {
    const tp = num(row.tp);
    const mcp = num(row.mcp || row.mrp || row.MCP || row.MRP);
    const erp_sku = (row.erp_sku || "").trim();
    const sku = (row.sku || row.SKU || "").trim();
    const channel_sku = (row.channel_sku || row.CHANNEL_SKU || "").trim();
    const brand = (row.Brand || row.brand || row.BRAND || "").trim();
    const url = (row.URL || row.url || "").trim();
    const name = (row.NAME || row.name || "").trim();

    const calc = solveSP(
      tp,
      mcp,
      pricingState.mode,
      row.erp_status,
      pricingState.continueTpDiff,
      pricingState.nonContinueTpDiff
    );

    return {
      erp_sku,
      sku,
      channel_sku,
      brand,
      erp_status: row.erp_status || "",
      url,
      name,
      tp,
      mcp,
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

  if (!contSelect || !nonContSelect) return;

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
  const contEl = document.getElementById("confirmModalContinue");
  const nonContEl = document.getElementById("confirmModalNonContinue");
  const nyriEl = document.getElementById("confirmModalNyri");
  const skuCountEl = document.getElementById("confirmModalSkuCount");

  const contVal = parseFloat(pricingState.continueTpDiff);
  const nonContVal = parseFloat(pricingState.nonContinueTpDiff);

  if (modeEl) modeEl.textContent = pricingState.mode;
  if (contEl) contEl.textContent = `${contVal >= 0 ? '+' : ''}${pricingState.continueTpDiff}%`;
  if (nonContEl) nonContEl.textContent = `${nonContVal >= 0 ? '+' : ''}${pricingState.nonContinueTpDiff}%`;
  
  if (nyriEl) {
    if (pricingState.nyriOnly) {
      nyriEl.textContent = "NYRI SKUs Only";
      nyriEl.className = "confirm-value font-bold text-pink";
    } else {
      nyriEl.textContent = "Standard (NYRI Excluded)";
      nyriEl.className = "confirm-value font-bold";
    }
  }

  if (skuCountEl) {
    const nyriOnly = Boolean(pricingState.nyriOnly);
    const validCount = rawPricingRows.filter(r => {
      const sku = (r.sku || r.SKU || r.erp_sku || "").trim();
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
      const sku = (r.sku || r.SKU || r.erp_sku || "").trim();
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

  const contLabel = document.getElementById("continueDiffLabel");
  if (contLabel) {
    const v = parseFloat(pricingState.continueTpDiff);
    contLabel.textContent = `${v >= 0 ? '+' : ''}${pricingState.continueTpDiff}%`;
  }

  const nonContLabel = document.getElementById("nonContinueDiffLabel");
  if (nonContLabel) {
    const v = parseFloat(pricingState.nonContinueTpDiff);
    nonContLabel.textContent = `${v >= 0 ? '+' : ''}${pricingState.nonContinueTpDiff}%`;
  }

  const nyriLabel = document.getElementById("nyriStatusLabel");
  if (nyriLabel) {
    if (pricingState.nyriOnly) {
      nyriLabel.textContent = "NYRI ONLY";
      nyriLabel.className = "badge badge-danger";
    } else {
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
      const sku = (r.sku || r.SKU || r.erp_sku || "").trim();
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
    bindEvents();
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

