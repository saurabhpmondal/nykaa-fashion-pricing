export function exportVisibleTable() {
  const table =
    document.getElementById("reportTable");

  if (!table) return;

  const rows = [...table.querySelectorAll("tr")];

  const csv = rows
    .map(row => {
      const cells = [
        ...row.querySelectorAll("th,td")
      ];

      return cells
        .map(cell => {
          const text = cell.innerText
            .replace(/"/g, '""')
            .trim();

          return `"${text}"`;
        })
        .join(",");
    })
    .join("\n");

  const blob = new Blob(
    [csv],
    {
      type: "text/csv;charset=utf-8;"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    "nykaa-fashion-pricing.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}