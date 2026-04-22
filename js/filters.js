import { lower, includesText } from "./utils.js";
import { getTargetPercent } from "./calculator.js";

/* -------------------------------- */
/* Search + Status + TP Diff Filter */
/* -------------------------------- */

export function applyFilters(rows, state) {
  const query = lower(state.search);
  const mode = state.mode;
  const tpDiff = String(state.tpDiff || "ALL");
  const status = lower(state.status || "ALL");

  return rows.filter(row => {
    /* Search */
    const matchSearch =
      !query ||
      includesText(row.erp_sku, query) ||
      includesText(row.sku, query);

    if (!matchSearch) return false;

    /* Status */
    if (
      status !== "all" &&
      lower(row.erp_status) !== status
    ) {
      return false;
    }

    /* EVENT ignores TP Diff */
    if (mode === "EVENT") {
      return true;
    }

    /* BAU TP Diff */
    if (tpDiff === "ALL") {
      return true;
    }

    const diff =
      getTargetPercent(
        mode,
        row.erp_status
      );

    return String(diff) === tpDiff;
  });
}

/* -------------------------------- */
/* Dynamic Status List */
/* -------------------------------- */

export function getStatuses(rows) {
  const map = {};

  rows.forEach(row => {
    const val =
      String(row.erp_status || "")
        .trim();

    if (val) {
      map[val] = true;
    }
  });

  return Object.keys(map).sort();
}