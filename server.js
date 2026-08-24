import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const SALES_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkNC483NRAy-kqGlTTMqvq4GsqNgqcxfzj5QkBA77T_8nXTpHhI3V2MQ3LM3A8m79dOeYBKXndNlzF/pub?gid=1492706460&single=true&output=csv";
const PRICING_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkNC483NRAy-kqGlTTMqvq4GsqNgqcxfzj5QkBA77T_8nXTpHhI3V2MQ3LM3A8m79dOeYBKXndNlzF/pub?gid=0&single=true&output=csv";

// Simple in-memory cache
let cache = {
  sales: { data: null, time: 0 },
  pricing: { data: null, time: 0 }
};
const CACHE_TTL = 300000; // 5 minutes

app.get('/api/sales-csv', async (req, res) => {
  try {
    const now = Date.now();
    if (cache.sales.data && (now - cache.sales.time < CACHE_TTL)) {
      res.setHeader('Content-Type', 'text/csv');
      return res.send(cache.sales.data);
    }
    const response = await fetch(SALES_SHEET_URL);
    const csvText = await response.text();
    cache.sales = { data: csvText, time: now };
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvText);
  } catch (err) {
    console.error('Error fetching sales CSV proxy:', err);
    res.status(500).send('Error fetching sales CSV');
  }
});

app.get('/api/pricing-csv', async (req, res) => {
  try {
    const now = Date.now();
    if (cache.pricing.data && (now - cache.pricing.time < CACHE_TTL)) {
      res.setHeader('Content-Type', 'text/csv');
      return res.send(cache.pricing.data);
    }
    const response = await fetch(PRICING_SHEET_URL);
    const csvText = await response.text();
    cache.pricing = { data: csvText, time: now };
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvText);
  } catch (err) {
    console.error('Error fetching pricing CSV proxy:', err);
    res.status(500).send('Error fetching pricing CSV');
  }
});

app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
