import { money, pct } from "./utils.js";

function profitClass(value) {
  return value >= 0
    ? "profit-pos"
    : "profit-neg";
}

function getStatusBadge(status) {
  const s = String(status || "").trim().toUpperCase();
  if (s === "CONTINUE" || s === "DELIVERED") {
    return `<span class="badge badge-success">${status}</span>`;
  } else if (s === "DISCONTINUE" || s.includes("CANCEL")) {
    return `<span class="badge badge-danger">${status}</span>`;
  } else if (s.includes("RETURN") || s.includes("RTO")) {
    return `<span class="badge badge-warning">${status}</span>`;
  } else if (s === "SHIPPED") {
    return `<span class="badge badge-info">${status}</span>`;
  }
  return `<span class="badge badge-neutral">${status || "N/A"}</span>`;
}

/**
 * Renders Executive KPI Cards in the top summary bar
 */
export function renderExecutiveCards(metrics = {}, pricingRows = []) {
  const kpiRevenue = document.getElementById("kpiRevenue");
  const kpiOrders = document.getElementById("kpiOrders");
  const kpiDelivered = document.getElementById("kpiDelivered");
  const kpiReturns = document.getElementById("kpiReturns");
  const kpiAvgMargin = document.getElementById("kpiAvgMargin");

  if (kpiRevenue) {
    kpiRevenue.textContent = money(metrics.totalGrossRevenue || 0);
  }
  if (kpiOrders) {
    kpiOrders.textContent = (metrics.totalOrders || 0).toLocaleString("en-IN");
  }
  if (kpiDelivered) {
    const rate = (metrics.deliveredRate || 0).toFixed(1);
    kpiDelivered.textContent = `${rate}% (${(metrics.deliveredCount || 0).toLocaleString("en-IN")})`;
  }
  if (kpiReturns) {
    const rate = (metrics.returnedRate || 0).toFixed(1);
    kpiReturns.textContent = `${rate}% (${(metrics.returnedCount || 0).toLocaleString("en-IN")})`;
  }
  if (kpiAvgMargin && pricingRows.length) {
    const totalProfitPct = pricingRows.reduce((acc, r) => acc + (r.tpProfitPct || 0), 0);
    const avgPct = totalProfitPct / pricingRows.length;
    kpiAvgMargin.textContent = pct(avgPct);
    kpiAvgMargin.className = `kpi-val ${profitClass(avgPct)}`;
  }
}

/**
 * Renders Pricing Engine 25-column Data Table
 */
export function renderTable(rows, limit) {
  const body = document.getElementById("tableBody");
  if (!body) return;

  const rowCount = document.getElementById("rowCount");
  const visibleCount = document.getElementById("visibleCount");

  if (!rows || !rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="25" style="text-align: center; padding: 48px 20px; background: #fafafa;">
          <div style="max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div style="font-size: 16px; font-weight: 700; color: #0f172a;">Price Engine Not Generated Yet</div>
            <div style="font-size: 13px; color: #64748b; line-height: 1.5;">Click 'Generate Prices' to run the solver and calculate optimal SP, commission, taxes, and margins across all catalog SKUs.</div>
            <button class="btn-generate-prices trigger-price-engine" style="margin-top: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <span>Generate Prices</span>
            </button>
          </div>
        </td>
      </tr>
    `;
    if (rowCount) rowCount.textContent = "0";
    if (visibleCount) visibleCount.textContent = "0";
    return;
  }

  const visible = rows.slice(0, limit);

  body.innerHTML = visible.map(row => `
    <tr>
      <td class="font-mono text-bold">
        ${row.url
          ? `<a href="${row.url}" target="_blank" rel="noopener" class="sku-link" title="Open product page on Nykaa Fashion">${row.erp_sku} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`
          : row.erp_sku
        }
      </td>
      <td class="font-mono">${row.sku}</td>
      <td>${getStatusBadge(row.erp_status)}</td>

      <td>${money(row.tp)}</td>
      <td>${money(row.mrp)}</td>

      <td class="font-bold">${money(row.sp)}</td>
      <td>${row.td}%</td>

      <td>${money(row.taxableValue)}</td>
      <td>${money(row.gst)}</td>

      <td>${money(row.commission)}</td>
      <td>${money(row.gstComm)}</td>
      <td>${money(row.commInvoice)}</td>

      <td>${money(row.forward)}</td>
      <td>${money(row.tcs)}</td>

      <td>${money(row.bankSettlement)}</td>
      <td>${money(row.tds)}</td>

      <td class="font-bold">${money(row.finalPayout)}</td>

      <td>${money(row.marketing)}</td>

      <td>${money(row.returnCharge)}</td>
      <td>${pct(row.returnPct)}</td>
      <td>${money(row.returnCODB)}</td>

      <td>${money(row.dispatch)}</td>

      <td class="${profitClass(row.tpProfitRs)} font-bold">
        ${money(row.payoutAfterCODB)}
      </td>

      <td class="${profitClass(row.tpProfitRs)} font-bold">
        ${pct(row.tpProfitPct)}
      </td>

      <td class="${profitClass(row.tpProfitRs)} font-bold">
        ${money(row.tpProfitRs)}
      </td>
    </tr>
  `).join("");

  if (rowCount) {
    rowCount.textContent = rows.length.toLocaleString("en-IN");
  }

  if (visibleCount) {
    visibleCount.textContent = visible.length.toLocaleString("en-IN");
  }

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.style.display = rows.length > limit ? "inline-flex" : "none";
  }
}

/**
 * Renders Sales Log Table
 */
export function renderSalesTable(salesRows = [], limit = 50, skuToPricingMap = new Map()) {
  const body = document.getElementById("salesTableBody");
  if (!body) return;

  const visible = salesRows.slice(0, limit);

  body.innerHTML = visible.map(row => {
    const qty = Math.max(1, parseInt(row.OrderQty || "1", 10));
    const price = parseFloat(row.UnitPrice || "0");
    const total = qty * price;
    const rawSku = (row.SKUCode || "").trim();
    const info = skuToPricingMap.get(rawSku) || {};
    const erpSku = info.erp_sku || rawSku || "N/A";
    const url = info.url || "";

    return `
      <tr>
        <td class="font-mono text-sm">${row.MagentoOrderNo || row.orderno || "N/A"}</td>
        <td class="font-mono text-bold">
          ${url
            ? `<a href="${url}" target="_blank" rel="noopener" class="sku-link" title="Open product page on Nykaa Fashion">${erpSku} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`
            : erpSku
          }
        </td>
        <td>${getStatusBadge(row.Status)}</td>
        <td class="text-right">${qty}</td>
        <td class="text-right">${money(price)}</td>
        <td class="text-right font-bold">${money(total)}</td>
        <td>${row.OrderDate || `${row.date}/${row.month}/${row.year}`}</td>
        <td>${row.State || "N/A"}</td>
      </tr>
    `;
  }).join("");

  const salesCountEl = document.getElementById("salesCount");
  if (salesCountEl) {
    salesCountEl.textContent = salesRows.length.toLocaleString("en-IN");
  }

  const salesLoadMoreBtn = document.getElementById("salesLoadMoreBtn");
  if (salesLoadMoreBtn) {
    salesLoadMoreBtn.style.display = salesRows.length > limit ? "inline-flex" : "none";
  }
}

/**
 * Renders Top Selling SKUs on Executive Overview
 */
export function renderTopSKUsTable(topSKUs = []) {
  const body = document.getElementById("topSKUsTableBody");
  if (!body) return;

  body.innerHTML = topSKUs.map((item, idx) => `
    <tr>
      <td class="font-bold text-center">#${idx + 1}</td>
      <td class="font-mono text-bold">
        ${item.url
          ? `<a href="${item.url}" target="_blank" rel="noopener" class="sku-link" title="Open product page on Nykaa Fashion">${item.erp_sku || item.sku} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`
          : (item.erp_sku || item.sku)
        }
      </td>
      <td class="text-right">${item.ordersCount}</td>
      <td class="text-right">${item.totalUnits}</td>
      <td class="text-right font-bold text-blue">${money(item.totalRevenue)}</td>
    </tr>
  `).join("");
}
