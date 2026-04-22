export function exportRows(rows) {
  if (!rows || !rows.length) return;

  /* Skip blank SKU rows */
  const cleanRows = rows.filter(
    row =>
      String(row.sku || "")
        .trim() !== ""
  );

  if (!cleanRows.length) return;

  const headers = [
    "ERP SKU",
    "SKU",
    "Status",
    "TP",
    "MRP",
    "SP",
    "TD%",
    "Taxable Value",
    "GST",
    "Commission",
    "GST Comm",
    "Comm Invoice",
    "Forward",
    "TCS",
    "Bank Settlement",
    "TDS",
    "Final Payout",
    "Marketing",
    "Return Charge",
    "Return%",
    "Return CODB",
    "Dispatch",
    "Payout After CODB",
    "TP Profit %",
    "TP Profit ₹"
  ];

  const lines = [];

  lines.push(headers.join(","));

  cleanRows.forEach(row => {
    lines.push([
      row.erp_sku,
      row.sku,
      row.erp_status,
      row.tp,
      row.mrp,
      row.sp,
      row.td,
      row.taxableValue,
      row.gst,
      row.commission,
      row.gstComm,
      row.commInvoice,
      row.forward,
      row.tcs,
      row.bankSettlement,
      row.tds,
      row.finalPayout,
      row.marketing,
      row.returnCharge,
      row.returnPct,
      row.returnCODB,
      row.dispatch,
      row.payoutAfterCODB,
      row.tpProfitPct,
      row.tpProfitRs
    ].map(v => `"${v}"`).join(","));
  });

  const csv =
    lines.join("\n");

  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;
  a.download =
    "nykaa-fashion-pricing.csv";

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}