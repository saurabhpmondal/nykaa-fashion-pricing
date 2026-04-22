export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function round2(value) {
  return Math.round(num(value) * 100) / 100;
}

export function money(value) {
  return round2(value).toFixed(2);
}

export function pct(value) {
  return round2(value).toFixed(2);
}

export function lower(value) {
  return String(value || "").trim().toLowerCase();
}

export function safeText(value) {
  return String(value || "").trim();
}

export function includesText(source, query) {
  return lower(source).includes(lower(query));
}