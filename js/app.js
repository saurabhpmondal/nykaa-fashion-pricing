import { loadRows } from "./fetcher.js";
import { solveSP } from "./calculator.js";
import { applyFilters } from "./filters.js";
import { renderTable } from "./ui.js";
import { exportVisibleTable } from "./exporter.js";
import { num } from "./utils.js";

/* ---------------------------- */
/* Global State */
/* ---------------------------- */

let rawRows = [];
let finalRows = [];

const state = {
  mode: "BAU",
  tpDiff: "ALL",
  search: ""
};

/* ---------------------------- */
/* Build Final Data */
/* ---------------------------- */

function buildRows() {
  finalRows = rawRows.map(row => {
    const tp = num(row.tp);
    const mrp = num(row.mrp);

    const result = solveSP(
      tp,
      mrp,
      state.mode,
      row.erp_status
    );

    return {
      erp_sku: row.erp_sku || "",
      sku: row.sku || "",
      erp_status: row.erp_status || "",
      tp,
      mrp,
      ...result
    };
  });
}

/* ---------------------------- */
/* Render */
/* ---------------------------- */

function refresh() {
  buildRows();

  const filtered =
    applyFilters(finalRows, state);

  renderTable(filtered);

  const modeLabel =
    document.getElementById("modeLabel");

  if (modeLabel) {
    modeLabel.textContent =
      state.mode;
  }
}

/* ---------------------------- */
/* Events */
/* ---------------------------- */

function bindEvents() {
  const modeSelect =
    document.getElementById(
      "modeSelect"
    );

  const tpDiffSelect =
    document.getElementById(
      "tpDiffSelect"
    );

  const searchInput =
    document.getElementById(
      "searchInput"
    );

  const exportBtn =
    document.getElementById(
      "exportBtn"
    );

  modeSelect.addEventListener(
    "change",
    e => {
      state.mode = e.target.value;
      refresh();
    }
  );

  tpDiffSelect.addEventListener(
    "change",
    e => {
      state.tpDiff = e.target.value;
      refresh();
    }
  );

  searchInput.addEventListener(
    "input",
    e => {
      state.search = e.target.value;
      refresh();
    }
  );

  exportBtn.addEventListener(
    "click",
    exportVisibleTable
  );
}

/* ---------------------------- */
/* Init */
/* ---------------------------- */

async function init() {
  rawRows = await loadRows();

  bindEvents();
  refresh();
}

init();