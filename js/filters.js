import { includesText, lower } from "./utils.js";
import { getTargetPercent } from "./calculator.js";

/* -------------------------------- */
/* Search + Dropdown Filters */
/* -------------------------------- */

export function applyFilters(rows, state) {
  const query = lower(state.search);
  const tpDiff = String(state.tpDiff || "ALL");

  return rows.filter(row => {
    /* Search */
    const matchSearch =
      !query ||
      includesText(row.erp_sku, query) ||
      includesText(row.sku, query);

    if (!matchSearch) return false;

    /* TP Diff */
    if (tpDiff === "ALL") return true;

    const diff = getTargetPercent(
      state.mode,
      row.erp_status
    );

    return String(diff) === tpDiff;
  });
}