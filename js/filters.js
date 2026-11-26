import { lower, includesText } from "./utils.js";
import { getTargetPercent } from "./calculator.js";

/* -------------------------------- */
/* Pricing Engine Filters */
/* -------------------------------- */

export function isNyriSku(row) {
  const brand = (row.Brand || row.brand || row.BRAND || "").trim().toUpperCase();
  if (brand === "NYRI") return true;
  const sku = (row.sku || row.SKU || "").trim().toUpperCase();
  const erpSku = (row.erp_sku || "").trim().toUpperCase();
  const channelSku = (row.channel_sku || row.CHANNEL_SKU || "").trim().toUpperCase();
  return sku.startsWith("NYRI") || erpSku.startsWith("NYRI") || channelSku.endsWith("NYRI");
}

export function applyFilters(rows, state) {
  const query = lower(state.search);
  const status = lower(state.status || "ALL");
  const nyriOnly = Boolean(state.nyriOnly);

  return rows.filter(row => {
    /* Strictly exclude rows with blank SKU */
    if (!String(row.sku || row.SKU || "").trim()) return false;

    /* NYRI Toggle Filter */
    const isNyri = isNyriSku(row);
    if (nyriOnly && !isNyri) return false;
    if (!nyriOnly && isNyri) return false;

    /* Search */
    const matchSearch =
      !query ||
      includesText(row.erp_sku, query) ||
      includesText(row.channel_sku, query) ||
      includesText(row.sku, query) ||
      includesText(row.product_id, query) ||
      includesText(row.brand, query) ||
      includesText(row.name, query);

    if (!matchSearch) return false;

    /* Status */
    if (
      status !== "all" &&
      lower(row.erp_status) !== status
    ) {
      return false;
    }

    return true;
  });
}

export function getStatuses(rows, nyriOnly = false) {
  const map = {};

  rows.forEach(row => {
    if (!String(row.sku || row.SKU || "").trim()) return;

    const isNyri = isNyriSku(row);
    if (nyriOnly && !isNyri) return;
    if (!nyriOnly && isNyri) return;

    const val = String(row.erp_status || "").trim();
    if (val) {
      map[val] = true;
    }
  });

  return Object.keys(map).sort();
}

/* -------------------------------- */
/* Sales Analytics Filters */
/* -------------------------------- */

export function applySalesFilters(salesRows, salesState) {
  const query = lower(salesState.search || "");
  const status = lower(salesState.status || "all");
  const state = lower(salesState.state || "all");

  return salesRows.filter(row => {
    /* Search SKU or Order No */
    const matchSearch =
      !query ||
      includesText(row.MagentoOrderNo, query) ||
      includesText(row.orderno, query) ||
      includesText(row.SKUCode, query);

    if (!matchSearch) return false;

    /* Status */
    if (status !== "all" && lower(row.Status) !== status) {
      return false;
    }

    /* State */
    if (state !== "all" && lower(row.State) !== state) {
      return false;
    }

    return true;
  });
}

export function getSalesStatuses(salesRows) {
  const map = {};
  salesRows.forEach(row => {
    const val = String(row.Status || "").trim();
    if (val) map[val] = true;
  });
  return Object.keys(map).sort();
}

export function getSalesStates(salesRows) {
  const map = {};
  salesRows.forEach(row => {
    const val = String(row.State || "").trim();
    if (val) map[val] = true;
  });
  return Object.keys(map).sort();
}
