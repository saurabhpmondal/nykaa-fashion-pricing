import { CSV_URL } from "./config.js";

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

export async function loadRows() {
  const text = await fetch(CSV_URL).then(r => r.text());

  const lines = text
    .split(/\r?\n/)
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim());

  const rows = lines.slice(1).map(line => {
    const cols = parseCSVLine(line);

    const row = {};

    headers.forEach((key, i) => {
      row[key.trim()] = (cols[i] || "").trim();
    });

    return row;
  });

  return rows;
}