import { CSV_URL, PRICING_CSV_URL, DIRECT_SALES_URL, DIRECT_PRICING_URL } from "./config.js";
import { StorageCache } from "./storage.js";

/* Parse CSV safely with quoted commas */
function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let inside = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      inside = !inside;
      continue;
    }

    if (ch === "," && !inside) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

export async function fetchCSV(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(Boolean);

    if (!lines.length) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.trim());

    return lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      const row = {};

      headers.forEach((key, i) => {
        row[key.trim()] = (cols[i] || "").trim();
      });

      return row;
    });
  } catch (err) {
    console.error("Error fetching CSV from", url, err);
    return null;
  }
}

/**
 * Primary Pricing Catalog Rows:
 * STRICT RULE: Only generate price for where sku column has value, and having tp > 0.
 * Else do not generate any price (filtered out to reduce working load and make tab effective).
 */
export async function loadRows(forceRefresh = false) {
  const cacheKey = "raw_pricing_rows";
  if (!forceRefresh) {
    const cached = StorageCache.get(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  let rows = await fetchCSV(PRICING_CSV_URL);
  if (!rows || !rows.length) {
    console.warn("Proxy pricing fetch failed, trying direct Google Sheets URL...");
    rows = await fetchCSV(DIRECT_PRICING_URL);
  }

  const allRows = rows || [];
  
  // Only keep where sku column has any identifier
  const validRows = allRows.filter(row => {
    const sku = (row.sku || row.SKU || row.erp_sku || "").trim();
    const tp = parseFloat(row.tp);
    // We allow tp >= 0 now, only filter out if tp is NaN or if there is no SKU identifier at all
    return Boolean(sku) && !isNaN(tp);
  });

  StorageCache.set(cacheKey, validRows);
  return validRows;
}

/* Sales Orders Rows */
export async function loadSalesRows(forceRefresh = false) {
  const cacheKey = "raw_sales_rows";
  if (!forceRefresh) {
    const cached = StorageCache.get(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  let rows = await fetchCSV(CSV_URL);
  if (!rows || !rows.length) {
    console.warn("Proxy sales fetch failed, trying direct Google Sheets URL...");
    rows = await fetchCSV(DIRECT_SALES_URL);
  }

  const salesRows = rows || [];
  StorageCache.set(cacheKey, salesRows);
  return salesRows;
}
