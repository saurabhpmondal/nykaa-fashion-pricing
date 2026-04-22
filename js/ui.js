import { money, pct } from "./utils.js";

function profitClass(value) {
  return value >= 0
    ? "profit-pos"
    : "profit-neg";
}

export function renderTable(rows) {
  const body =
    document.getElementById("tableBody");

  if (!body) return;

  body.innerHTML = rows.map(row => `
    <tr>
      <td>${row.erp_sku}</td>
      <td>${row.sku}</td>
      <td>${row.erp_status}</td>

      <td>${money(row.tp)}</td>
      <td>${money(row.mrp)}</td>

      <td>${money(row.sp)}</td>
      <td>${pct(row.td)}</td>

      <td>${money(row.taxableValue)}</td>
      <td>${money(row.gst)}</td>

      <td>${money(row.commission)}</td>
      <td>${money(row.gstComm)}</td>
      <td>${money(row.commInvoice)}</td>

      <td>${money(row.forward)}</td>
      <td>${money(row.tcs)}</td>

      <td>${money(row.bankSettlement)}</td>
      <td>${money(row.tds)}</td>

      <td>${money(row.finalPayout)}</td>

      <td>${money(row.marketing)}</td>

      <td>${money(row.returnCharge)}</td>
      <td>${pct(row.returnPct)}</td>
      <td>${money(row.returnCODB)}</td>

      <td>${money(row.dispatch)}</td>

      <td class="${profitClass(row.tpProfitRs)}">
        ${money(row.payoutAfterCODB)}
      </td>

      <td class="${profitClass(row.tpProfitRs)}">
        ${pct(row.tpProfitPct)}
      </td>

      <td class="${profitClass(row.tpProfitRs)}">
        ${money(row.tpProfitRs)}
      </td>
    </tr>
  `).join("");

  const rowCount =
    document.getElementById("rowCount");

  if (rowCount) {
    rowCount.textContent = rows.length;
  }
}