function pad(v) {
  return String(v).padStart(2, "0");
}

function getNowParts() {
  const d = new Date();

  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());

  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${mi}`,
    stamp: `${yyyy}-${mm}-${dd}-${hh}${mi}`
  };
}

function cleanName(v) {
  return String(v || "all")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function targetRule(mode, status) {
  const s = String(status || "")
    .trim()
    .toUpperCase();

  const isContinue =
    s === "CONTINUE";

  if (mode === "BAU") {
    return isContinue
      ? "TP+5%"
      : "TP+0%";
  }

  return isContinue
    ? "TP-10%"
    : "TP-30%";
}

export function exportRows(
  rows,
  state
) {
  if (!rows || !rows.length) return;

  const cleanRows =
    rows.filter(
      row =>
        String(row.sku || "")
          .trim() !== ""
    );

  if (!cleanRows.length) return;

  const now =
    getNowParts();

  const fileName =
    `nykaa_${cleanName(
      state.mode
    )}_${cleanName(
      state.status
    )}_${now.stamp}.csv`;

  const lines = [];

  /* Helper Rows */
  lines.push(
    `"Nykaa Fashion Pricing Engine Export"`
  );
  lines.push(
    `"Export Date","${now.date}"`
  );
  lines.push(
    `"Export Time","${now.time}"`
  );
  lines.push(
    `"Pricing Mode","${state.mode}"`
  );
  lines.push(
    `"TP Diff Filter","${state.tpDiff}"`
  );
  lines.push(
    `"Status Filter","${state.status}"`
  );
  lines.push(
    `"Search Filter","${state.search || "All"}"`
  );
  lines.push(
    `"Rows Exported","${cleanRows.length}"`
  );
  lines.push("");

  /* Headers */
  lines.push([
    "ERP SKU",
    "SKU",
    "Status",
    "Target Rule",
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
  ].map(v => `"${v}"`).join(","));

  /* Data Rows */
  cleanRows.forEach(row => {
    lines.push([
      row.erp_sku,
      row.sku,
      row.erp_status,
      targetRule(
        state.mode,
        row.erp_status
      ),
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
    ]
      .map(v => `"${v}"`)
      .join(","));
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
  a.download = fileName;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}