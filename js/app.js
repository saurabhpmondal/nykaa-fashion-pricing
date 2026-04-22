import { loadRows } from "./fetcher.js";
import { solveSP } from "./calculator.js";
import {
  applyFilters,
  getStatuses
} from "./filters.js";
import { renderTable } from "./ui.js";
import { exportRows } from "./exporter.js";
import { num } from "./utils.js";

/* ---------------------------- */
/* State */
/* ---------------------------- */

let rawRows = [];
let finalRows = [];
let filteredRows = [];

let visibleLimit = 50;
let searchTimer = null;

const state = {
  mode: "BAU",
  tpDiff: "ALL",
  status: "ALL",
  search: ""
};

/* ---------------------------- */
/* Build Engine Rows */
/* ---------------------------- */

function buildRows() {
  finalRows = rawRows.map(row => {
    const tp = num(row.tp);
    const mrp = num(row.mrp);

    const calc = solveSP(
      tp,
      mrp,
      state.mode,
      row.erp_status
    );

    return {
      erp_sku: row.erp_sku || "",
      sku: row.sku || "",
      erp_status:
        row.erp_status || "",
      tp,
      mrp,
      ...calc
    };
  });
}

/* ---------------------------- */
/* Status Dropdown */
/* ---------------------------- */

function populateStatus() {
  const el =
    document.getElementById(
      "statusSelect"
    );

  const statuses =
    getStatuses(rawRows);

  el.innerHTML =
    `<option value="ALL">All</option>` +
    statuses
      .map(s => `
        <option value="${s}">
          ${s}
        </option>
      `)
      .join("");
}

/* ---------------------------- */
/* Refresh */
/* ---------------------------- */

function refresh() {
  buildRows();

  filteredRows =
    applyFilters(
      finalRows,
      state
    );

  renderTable(
    filteredRows,
    visibleLimit
  );

  document.getElementById(
    "modeLabel"
  ).textContent =
    state.mode;

  const tpDiffSelect =
    document.getElementById(
      "tpDiffSelect"
    );

  if (
    state.mode === "EVENT"
  ) {
    tpDiffSelect.disabled = true;
    tpDiffSelect.value = "ALL";
  } else {
    tpDiffSelect.disabled = false;
  }
}

/* ---------------------------- */
/* Events */
/* ---------------------------- */

function bindEvents() {
  document
    .getElementById(
      "modeSelect"
    )
    .addEventListener(
      "change",
      e => {
        state.mode =
          e.target.value;

        visibleLimit = 50;
        refresh();
      }
    );

  document
    .getElementById(
      "tpDiffSelect"
    )
    .addEventListener(
      "change",
      e => {
        state.tpDiff =
          e.target.value;

        visibleLimit = 50;
        refresh();
      }
    );

  document
    .getElementById(
      "statusSelect"
    )
    .addEventListener(
      "change",
      e => {
        state.status =
          e.target.value;

        visibleLimit = 50;
        refresh();
      }
    );

  document
    .getElementById(
      "searchInput"
    )
    .addEventListener(
      "input",
      e => {
        clearTimeout(
          searchTimer
        );

        searchTimer =
          setTimeout(() => {
            state.search =
              e.target.value;

            visibleLimit = 50;
            refresh();
          }, 250);
      }
    );

  document
    .getElementById(
      "loadMoreBtn"
    )
    .addEventListener(
      "click",
      () => {
        visibleLimit += 50;

        renderTable(
          filteredRows,
          visibleLimit
        );
      }
    );

  document
    .getElementById(
      "exportBtn"
    )
    .addEventListener(
      "click",
      () => {
        exportRows(
          filteredRows,
          state
        );
      }
    );
}

/* ---------------------------- */
/* Init */
/* ---------------------------- */

async function init() {
  rawRows =
    await loadRows();

  populateStatus();
  bindEvents();
  refresh();
}

init();