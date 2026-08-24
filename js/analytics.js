import { num } from "./utils.js";

/**
 * Computes comprehensive sales metrics and breakdowns from raw sales CSV rows.
 */
export function computeSalesMetrics(salesRows = [], skuToPricingMap = new Map()) {
  if (!salesRows || !salesRows.length) {
    return {
      totalOrders: 0,
      totalUnits: 0,
      totalGrossRevenue: 0,
      avgOrderValue: 0,
      statusBreakdown: {},
      deliveredCount: 0,
      deliveredRevenue: 0,
      deliveredRate: 0,
      returnedCount: 0,
      returnedRevenue: 0,
      returnedRate: 0,
      cancelledCount: 0,
      cancelledRate: 0,
      topStates: [],
      monthlyTrends: [],
      topSellingSKUs: [],
      skuSalesMap: new Map()
    };
  }

  let totalOrders = 0;
  let totalUnits = 0;
  let totalGrossRevenue = 0;

  let deliveredCount = 0;
  let deliveredRevenue = 0;
  let returnedCount = 0;
  let returnedRevenue = 0;
  let cancelledCount = 0;

  const statusMap = {};
  const stateMap = {};
  const monthMap = {};
  const skuSalesMap = new Map();

  salesRows.forEach(row => {
    const qty = Math.max(1, parseInt(row.OrderQty || "1", 10));
    const unitPrice = num(row.UnitPrice);
    const rev = qty * unitPrice;
    const status = (row.Status || "Unknown").trim();
    const rawState = (row.State || "Unspecified").trim();
    // Normalize state casing
    const state = rawState.charAt(0).toUpperCase() + rawState.slice(1).toLowerCase();
    const sku = (row.SKUCode || "").trim();

    totalOrders += 1;
    totalUnits += qty;
    totalGrossRevenue += rev;

    // Status breakdown
    if (!statusMap[status]) {
      statusMap[status] = { count: 0, revenue: 0, units: 0 };
    }
    statusMap[status].count += 1;
    statusMap[status].revenue += rev;
    statusMap[status].units += qty;

    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "delivered") {
      deliveredCount += 1;
      deliveredRevenue += rev;
    } else if (lowerStatus.includes("return")) {
      returnedCount += 1;
      returnedRevenue += rev;
    } else if (lowerStatus.includes("cancel")) {
      cancelledCount += 1;
    }

    // State breakdown
    if (!stateMap[state]) {
      stateMap[state] = { count: 0, revenue: 0 };
    }
    stateMap[state].count += 1;
    stateMap[state].revenue += rev;

    // Month breakdown (month & year)
    const month = row.month || "6";
    const year = row.year || "2026";
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = parseInt(month, 10) - 1;
    const monthLabel = monthNames[monthIdx] ? `${monthNames[monthIdx]} ${year}` : `M${month} ${year}`;

    if (!monthMap[monthLabel]) {
      monthMap[monthLabel] = { label: monthLabel, orders: 0, revenue: 0, units: 0 };
    }
    monthMap[monthLabel].orders += 1;
    monthMap[monthLabel].revenue += rev;
    monthMap[monthLabel].units += qty;

    // SKU aggregation
    if (sku) {
      if (!skuSalesMap.has(sku)) {
        skuSalesMap.set(sku, {
          sku,
          ordersCount: 0,
          totalRevenue: 0,
          totalUnits: 0,
          returnCount: 0
        });
      }
      const skuStats = skuSalesMap.get(sku);
      skuStats.ordersCount += 1;
      skuStats.totalRevenue += rev;
      skuStats.totalUnits += qty;
      if (lowerStatus.includes("return")) {
        skuStats.returnCount += 1;
      }
    }
  });

  const avgOrderValue = totalOrders > 0 ? totalGrossRevenue / totalOrders : 0;
  const deliveredRate = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0;
  const returnedRate = totalOrders > 0 ? (returnedCount / totalOrders) * 100 : 0;
  const cancelledRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;

  // Top states sorted by revenue
  const topStates = Object.entries(stateMap)
    .map(([state, data]) => ({ state, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  // Monthly trends
  const monthlyTrends = Object.values(monthMap);

  // Top selling SKUs
  const topSellingSKUs = Array.from(skuSalesMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10)
    .map(item => {
      const info = skuToPricingMap.get(item.sku) || {};
      return {
        ...item,
        erp_sku: info.erp_sku || item.sku,
        url: info.url || "",
        name: info.name || ""
      };
    });

  return {
    totalOrders,
    totalUnits,
    totalGrossRevenue,
    avgOrderValue,
    statusBreakdown: statusMap,
    deliveredCount,
    deliveredRevenue,
    deliveredRate,
    returnedCount,
    returnedRevenue,
    returnedRate,
    cancelledCount,
    cancelledRate,
    topStates,
    monthlyTrends,
    topSellingSKUs,
    skuSalesMap
  };
}

/**
 * Links aggregated sales data to pricing rows
 */
export function linkSalesToPricingRows(pricingRows, skuSalesMap) {
  return pricingRows.map(row => {
    const sku = (row.sku || "").trim();
    const salesData = skuSalesMap.get(sku) || {
      ordersCount: 0,
      totalRevenue: 0,
      totalUnits: 0,
      returnCount: 0
    };

    const salesReturnRate = salesData.ordersCount > 0
      ? (salesData.returnCount / salesData.ordersCount) * 100
      : 0;

    return {
      ...row,
      salesCount: salesData.ordersCount,
      salesRevenue: salesData.totalRevenue,
      salesUnits: salesData.totalUnits,
      salesReturnRate
    };
  });
}
