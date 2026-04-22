# Nykaa Fashion Pricing Engine

Modern SaaS web app to calculate reverse Selling Price (SP) for Nykaa Fashion based on TP margin targets.

## Features

- Live Google Sheet CSV fetch
- BAU / EVENT pricing modes
- TP Diff filters
- Search by ERP SKU / SKU
- Reverse SP solver
- Full commercial calculations
- Export visible report to CSV
- Mobile responsive UI
- GitHub Pages ready

## Input Source

Google Sheet CSV columns:

- erp_sku
- sku
- erp_status
- tp
- mrp

## Repo Structure

index.html

/css
- reset.css
- variables.css
- layout.css
- components.css

/js
- app.js
- config.js
- fetcher.js
- calculator.js
- filters.js
- exporter.js
- ui.js
- utils.js

## Deploy

Push to GitHub and enable GitHub Pages from root branch.

## Author

Nykaa Fashion Pricing Project