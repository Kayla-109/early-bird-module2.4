/**
 * Preprocess simulation_data CSV files into frontend-friendly JSON
 * Run: node scripts/preprocess-data.js
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../simulation_data/generated_datasets_sdv_SMALL');
const OUT_DIR = path.resolve(__dirname, '../public/data');

function readCSV(filename) {
  const text = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      const v = values[i]?.trim();
      if (v === 'True') obj[h] = true;
      else if (v === 'False') obj[h] = false;
      else if (!isNaN(Number(v)) && v !== '') obj[h] = Number(v);
      else obj[h] = v;
    });
    return obj;
  });
}

function writeJSON(filename, data) {
  fs.writeFileSync(path.join(OUT_DIR, filename), JSON.stringify(data));
  console.log(`✓ ${filename} (${Array.isArray(data) ? data.length : Object.keys(data).length} items)`);
}

// ─── Main ───────────────────────────────────────────────────────
console.log('Preprocessing simulation data...\n');

// 1. Products
const products = readCSV('products.csv');
writeJSON('products.json', products);

// 2. Customers
const customers = readCSV('customers.csv');
writeJSON('customers.json', customers);

// 3. Warehouses
const warehouses = readCSV('warehouses.csv');
writeJSON('warehouses.json', warehouses);

// 4. Inventory Batches → summary by sku+warehouse
const inventoryBatches = readCSV('inventory_batches.csv');
const invSummary = {};
inventoryBatches.forEach(b => {
  const key = `${b.sku_id}|${b.warehouse_id}`;
  if (!invSummary[key]) {
    invSummary[key] = {
      sku_id: b.sku_id,
      warehouse_id: b.warehouse_id,
      total_qty: 0,
      reserved_qty: 0,
      near_expiry_qty: 0,
      expired_qty: 0,
      batches: 0,
      min_days_to_expiry: Infinity,
    };
  }
  const s = invSummary[key];
  s.total_qty += b.quantity_available;
  s.reserved_qty += b.quantity_reserved;
  s.batches += 1;
  if (b.quality_status === 'near_expiry') s.near_expiry_qty += b.quantity_available;
  if (b.quality_status === 'expired') s.expired_qty += b.quantity_available;
  if (b.days_to_expiry < s.min_days_to_expiry) s.min_days_to_expiry = b.days_to_expiry;
});
writeJSON('inventory_summary.json', Object.values(invSummary));

// 5. Terminal Inventory
const terminalInventory = readCSV('terminal_inventory.csv');
writeJSON('terminal_inventory.json', terminalInventory);

// 6. Orders + Order Lines
const orders = readCSV('orders.csv');
const orderLines = readCSV('order_lines.csv');

const orderMap = {};
orders.forEach(o => { orderMap[o.order_id] = o; });

const orderLineDetails = orderLines.map(ol => ({
  ...ol,
  ...orderMap[ol.order_id],
}));

// Order stats by customer_type & category
const orderStats = {
  total_orders: orders.length,
  total_lines: orderLines.length,
  total_units: orderLines.reduce((s, l) => s + l.quantity_ordered, 0),
  by_customer_type: {},
  by_priority: {},
  by_status: {},
};
orders.forEach(o => {
  orderStats.by_priority[o.priority_level] = (orderStats.by_priority[o.priority_level] || 0) + 1;
  orderStats.by_status[o.order_status] = (orderStats.by_status[o.order_status] || 0) + 1;
});
orderLineDetails.forEach(ol => {
  const ct = ol.customer_type;
  if (!orderStats.by_customer_type[ct]) orderStats.by_customer_type[ct] = { orders: new Set(), lines: 0, units: 0 };
  orderStats.by_customer_type[ct].orders.add(ol.order_id);
  orderStats.by_customer_type[ct].lines += 1;
  orderStats.by_customer_type[ct].units += ol.quantity_ordered;
});
Object.keys(orderStats.by_customer_type).forEach(k => {
  orderStats.by_customer_type[k].orders = orderStats.by_customer_type[k].orders.size;
});
writeJSON('order_stats.json', orderStats);

// 7. Historical Sales — process in chunks to avoid memory blow
console.log('Processing historical_sales.csv (this may take a moment)...');
const salesText = fs.readFileSync(path.join(DATA_DIR, 'historical_sales.csv'), 'utf-8');
const salesLines = salesText.trim().split('\n');
const salesHeaders = salesLines[0].split(',').map(h => h.trim());

const skuTimeSeries = {};       // { sku_id: [{date, units, revenue, stockout, promotion}, ...] }
const categoryMonthly = {};     // { category: [{yearMonth, units, revenue, orders}, ...] }
const customerTypeMonthly = {}; // { customer_type: { category: [{yearMonth, units}, ...] } }
const regionMonthly = {};       // { region: [{yearMonth, units}, ...] }
const skuMonthly = {};          // { sku_id: [{yearMonth, units, revenue}, ...] }

for (let i = 1; i < salesLines.length; i++) {
  const values = salesLines[i].split(',');
  const row = {};
  salesHeaders.forEach((h, idx) => {
    const v = values[idx]?.trim();
    if (v === 'True') row[h] = true;
    else if (v === 'False') row[h] = false;
    else if (!isNaN(Number(v)) && v !== '') row[h] = Number(v);
    else row[h] = v;
  });

  const { date, sku_id, customer_type, region, units_sold, sales_revenue_rmb, stockout_flag, promotion_flag } = row;
  const yearMonth = date.slice(0, 7);
  
  // Find category for SKU
  const product = products.find(p => p.sku_id === sku_id);
  const category = product ? product.category : 'Unknown';

  // skuTimeSeries
  if (!skuTimeSeries[sku_id]) skuTimeSeries[sku_id] = [];
  skuTimeSeries[sku_id].push({ date, units: units_sold, revenue: sales_revenue_rmb, stockout: stockout_flag, promotion: promotion_flag, category, customer_type, region });

  // categoryMonthly
  if (!categoryMonthly[category]) categoryMonthly[category] = {};
  if (!categoryMonthly[category][yearMonth]) categoryMonthly[category][yearMonth] = { yearMonth, units: 0, revenue: 0, orders: 0 };
  categoryMonthly[category][yearMonth].units += units_sold;
  categoryMonthly[category][yearMonth].revenue += sales_revenue_rmb;
  categoryMonthly[category][yearMonth].orders += 1;

  // customerTypeMonthly
  if (!customerTypeMonthly[customer_type]) customerTypeMonthly[customer_type] = {};
  if (!customerTypeMonthly[customer_type][category]) customerTypeMonthly[customer_type][category] = {};
  if (!customerTypeMonthly[customer_type][category][yearMonth]) customerTypeMonthly[customer_type][category][yearMonth] = { yearMonth, units: 0, revenue: 0 };
  customerTypeMonthly[customer_type][category][yearMonth].units += units_sold;
  customerTypeMonthly[customer_type][category][yearMonth].revenue += sales_revenue_rmb;

  // regionMonthly
  if (!regionMonthly[region]) regionMonthly[region] = {};
  if (!regionMonthly[region][yearMonth]) regionMonthly[region][yearMonth] = { yearMonth, units: 0, revenue: 0 };
  regionMonthly[region][yearMonth].units += units_sold;
  regionMonthly[region][yearMonth].revenue += sales_revenue_rmb;

  // skuMonthly
  if (!skuMonthly[sku_id]) skuMonthly[sku_id] = {};
  if (!skuMonthly[sku_id][yearMonth]) skuMonthly[sku_id][yearMonth] = { yearMonth, units: 0, revenue: 0 };
  skuMonthly[sku_id][yearMonth].units += units_sold;
  skuMonthly[sku_id][yearMonth].revenue += sales_revenue_rmb;
}

// Convert nested objects to sorted arrays
const categoryMonthlyArr = {};
Object.keys(categoryMonthly).forEach(cat => {
  categoryMonthlyArr[cat] = Object.values(categoryMonthly[cat]).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
});

const customerTypeMonthlyArr = {};
Object.keys(customerTypeMonthly).forEach(ct => {
  customerTypeMonthlyArr[ct] = {};
  Object.keys(customerTypeMonthly[ct]).forEach(cat => {
    customerTypeMonthlyArr[ct][cat] = Object.values(customerTypeMonthly[ct][cat]).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  });
});

const regionMonthlyArr = {};
Object.keys(regionMonthly).forEach(r => {
  regionMonthlyArr[r] = Object.values(regionMonthly[r]).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
});

const skuMonthlyArr = {};
Object.keys(skuMonthly).forEach(sku => {
  skuMonthlyArr[sku] = Object.values(skuMonthly[sku]).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
});

// Compact sku time series: daily aggregation per SKU (from ~1.1M raw → ~162K aggregated daily)
const skuDaily = {};
Object.keys(skuTimeSeries).forEach(sku => {
  const daily = {};
  skuTimeSeries[sku].forEach(r => {
    if (!daily[r.date]) {
      daily[r.date] = { date: r.date, units: 0, revenue: 0, stockout_days: 0, promotion_days: 0, count: 0, category: r.category };
    }
    daily[r.date].units += r.units;
    daily[r.date].revenue += r.revenue;
    if (r.stockout) daily[r.date].stockout_days += 1;
    if (r.promotion) daily[r.date].promotion_days += 1;
    daily[r.date].count += 1;
  });
  skuDaily[sku] = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
});

writeJSON('sku_daily.json', skuDaily);
writeJSON('category_monthly.json', categoryMonthlyArr);
writeJSON('customer_type_monthly.json', customerTypeMonthlyArr);
writeJSON('region_monthly.json', regionMonthlyArr);
writeJSON('sku_monthly.json', skuMonthlyArr);

// 8. Epidemiology simulation data (generate seasonal flu curves)
const epidemiologyData = [];
const regions = Object.keys(regionMonthlyArr);
const startDate = new Date('2024-06-01');
for (let i = 0; i < 730; i++) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + i);
  const dateStr = d.toISOString().slice(0, 10);
  const month = d.getMonth();
  // Northern hemisphere flu season: Nov-Mar peaks
  const fluBase = month >= 10 || month <= 2 ? 0.6 + Math.sin((month % 12) / 5 * Math.PI) * 0.4 : 0.05;
  regions.forEach(region => {
    const randFactor = 0.7 + Math.random() * 0.6;
    epidemiologyData.push({
      date: dateStr,
      region,
      flu_index: Math.round(fluBase * randFactor * 100) / 100,
      covid_index: Math.round((0.1 + Math.random() * 0.15) * 100) / 100,
      respiratory_index: Math.round((fluBase * 0.8 + 0.1) * randFactor * 100) / 100,
    });
  });
}
writeJSON('epidemiology.json', epidemiologyData);

console.log('\n✅ All data preprocessed successfully!');
console.log(`Output directory: ${OUT_DIR}`);
