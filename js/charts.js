/* Global Chart instances store */
let revenueChartInstance = null;
let statusChartInstance = null;
let statesChartInstance = null;

const CHART_COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  indigo: '#6366f1',
  teal: '#14b8a6',
  gray: '#9ca3af',
  slateDark: '#1e293b'
};

/**
 * Initializes/Renders the Executive Revenue Trend Chart
 */
export function renderRevenueChart(canvasId, monthlyTrends = []) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;

  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  const labels = monthlyTrends.map(t => t.label);
  const revenueData = monthlyTrends.map(t => Math.round(t.revenue));
  const ordersData = monthlyTrends.map(t => t.orders);

  revenueChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenue (₹)',
          data: revenueData,
          backgroundColor: 'rgba(59, 130, 246, 0.85)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Order Count',
          data: ordersData,
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'Inter, system-ui, sans-serif', size: 12, weight: '600' }
          }
        },
        tooltip: {
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function (context) {
              if (context.dataset.yAxisID === 'y') {
                return ` Revenue: ₹${context.raw.toLocaleString('en-IN')}`;
              }
              return ` Orders: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { size: 11 },
            callback: value => '₹' + (value >= 100000 ? (value / 100000).toFixed(1) + 'L' : value.toLocaleString('en-IN'))
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

/**
 * Renders Order Status Doughnut Chart
 */
export function renderStatusChart(canvasId, statusBreakdown = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;

  if (statusChartInstance) {
    statusChartInstance.destroy();
  }

  const entries = Object.entries(statusBreakdown);
  const labels = entries.map(([status]) => status);
  const counts = entries.map(([, data]) => data.count);

  const statusColorMap = {
    'Delivered': CHART_COLORS.green,
    'Returned': CHART_COLORS.amber,
    'RTO Delivered': '#d97706',
    'Cancelled': CHART_COLORS.red,
    'Shipped': CHART_COLORS.blue,
    'Ready for Ship': CHART_COLORS.indigo,
    'Confirmed': CHART_COLORS.teal
  };

  const backgroundColors = labels.map(status => statusColorMap[status] || CHART_COLORS.purple);

  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: counts,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            padding: 14,
            font: { family: 'Inter, system-ui, sans-serif', size: 11, weight: '500' }
          }
        },
        tooltip: {
          padding: 10,
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((context.raw / total) * 100).toFixed(1);
              return ` ${context.label}: ${context.raw} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Renders Top States Horizontal Bar Chart
 */
export function renderStatesChart(canvasId, topStates = []) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;

  if (statesChartInstance) {
    statesChartInstance.destroy();
  }

  const slice = topStates.slice(0, 8);
  const labels = slice.map(s => s.state);
  const revenueData = slice.map(s => Math.round(s.revenue));

  statesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'State Sales (₹)',
          data: revenueData,
          backgroundColor: 'rgba(99, 102, 241, 0.85)',
          borderRadius: 6,
          barThickness: 16
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return ` Sales: ₹${context.raw.toLocaleString('en-IN')}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { size: 11 },
            callback: value => '₹' + (value >= 100000 ? (value / 100000).toFixed(1) + 'L' : value)
          }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11, weight: '500' } }
        }
      }
    }
  });
}
