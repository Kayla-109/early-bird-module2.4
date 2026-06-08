"""
Preprocess simulation_data CSV files into frontend-friendly JSON
Run: python scripts/preprocess_data.py
"""
import csv
import json
import os
from pathlib import Path
from datetime import datetime, timedelta
import random

random.seed(42)

DATA_DIR = Path(__file__).parent.parent.parent / "simulation_data/generated_datasets_sdv_SMALL"
OUT_DIR = Path(__file__).parent.parent / "public/data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

def read_csv(filename):
    path = DATA_DIR / filename
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            parsed = {}
            for k, v in row.items():
                v = v.strip()
                if v == 'True':
                    parsed[k] = True
                elif v == 'False':
                    parsed[k] = False
                else:
                    try:
                        parsed[k] = int(v)
                    except ValueError:
                        try:
                            parsed[k] = float(v)
                        except ValueError:
                            parsed[k] = v
            rows.append(parsed)
        return rows

def write_json(filename, data):
    with open(OUT_DIR / filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    count = len(data) if isinstance(data, list) else len(data.keys())
    print(f"✓ {filename} ({count} items)")

print("Preprocessing simulation data...\n")

# 1. Products
products = read_csv('products.csv')
product_map = {p['sku_id']: p for p in products}
write_json('products.json', products)

# 2. Customers
customers = read_csv('customers.csv')
write_json('customers.json', customers)

# 3. Warehouses
warehouses = read_csv('warehouses.csv')
write_json('warehouses.json', warehouses)

# 4. Inventory Batches → summary by sku+warehouse
inventory_batches = read_csv('inventory_batches.csv')
inv_summary = {}
for b in inventory_batches:
    key = f"{b['sku_id']}|{b['warehouse_id']}"
    if key not in inv_summary:
        inv_summary[key] = {
            'sku_id': b['sku_id'],
            'warehouse_id': b['warehouse_id'],
            'total_qty': 0,
            'reserved_qty': 0,
            'near_expiry_qty': 0,
            'expired_qty': 0,
            'batches': 0,
            'min_days_to_expiry': float('inf'),
        }
    s = inv_summary[key]
    s['total_qty'] += b['quantity_available']
    s['reserved_qty'] += b['quantity_reserved']
    s['batches'] += 1
    if b.get('quality_status') == 'near_expiry':
        s['near_expiry_qty'] += b['quantity_available']
    if b.get('quality_status') == 'expired':
        s['expired_qty'] += b['quantity_available']
    if b['days_to_expiry'] < s['min_days_to_expiry']:
        s['min_days_to_expiry'] = b['days_to_expiry']
write_json('inventory_summary.json', list(inv_summary.values()))

# 5. Terminal Inventory
terminal_inventory = read_csv('terminal_inventory.csv')
write_json('terminal_inventory.json', terminal_inventory)

# 6. Orders + Order Lines
orders = read_csv('orders.csv')
order_lines = read_csv('order_lines.csv')

order_map = {o['order_id']: o for o in orders}

order_stats = {
    'total_orders': len(orders),
    'total_lines': len(order_lines),
    'total_units': sum(l['quantity_ordered'] for l in order_lines),
    'by_customer_type': {},
    'by_priority': {},
    'by_status': {},
}

for o in orders:
    pl = o['priority_level']
    order_stats['by_priority'][pl] = order_stats['by_priority'].get(pl, 0) + 1
    st = o['order_status']
    order_stats['by_status'][st] = order_stats['by_status'].get(st, 0) + 1

ct_sets = {}
for ol in order_lines:
    o = order_map[ol['order_id']]
    ct = o['customer_type']
    if ct not in ct_sets:
        ct_sets[ct] = {'orders': set(), 'lines': 0, 'units': 0}
    ct_sets[ct]['orders'].add(ol['order_id'])
    ct_sets[ct]['lines'] += 1
    ct_sets[ct]['units'] += ol['quantity_ordered']

for k, v in ct_sets.items():
    order_stats['by_customer_type'][k] = {
        'orders': len(v['orders']),
        'lines': v['lines'],
        'units': v['units'],
    }
write_json('order_stats.json', order_stats)

# 7. Historical Sales
print("Processing historical_sales.csv (this may take a moment)...")
sales = read_csv('historical_sales.csv')

sku_time_series = {}
category_monthly = {}
customer_type_monthly = {}
region_monthly = {}
sku_monthly = {}

for row in sales:
    date = row['date']
    sku_id = row['sku_id']
    customer_type = row['customer_type']
    region = row['region']
    units = row['units_sold']
    revenue = row['sales_revenue_rmb']
    stockout = row['stockout_flag']
    promotion = row['promotion_flag']
    year_month = date[:7]
    category = product_map.get(sku_id, {}).get('category', 'Unknown')

    # sku_time_series (raw, will aggregate later)
    if sku_id not in sku_time_series:
        sku_time_series[sku_id] = []
    sku_time_series[sku_id].append({
        'date': date, 'units': units, 'revenue': revenue,
        'stockout': stockout, 'promotion': promotion,
        'category': category, 'customer_type': customer_type, 'region': region
    })

    # category_monthly
    if category not in category_monthly:
        category_monthly[category] = {}
    if year_month not in category_monthly[category]:
        category_monthly[category][year_month] = {'yearMonth': year_month, 'units': 0, 'revenue': 0, 'orders': 0}
    category_monthly[category][year_month]['units'] += units
    category_monthly[category][year_month]['revenue'] += revenue
    category_monthly[category][year_month]['orders'] += 1

    # customer_type_monthly
    if customer_type not in customer_type_monthly:
        customer_type_monthly[customer_type] = {}
    if category not in customer_type_monthly[customer_type]:
        customer_type_monthly[customer_type][category] = {}
    if year_month not in customer_type_monthly[customer_type][category]:
        customer_type_monthly[customer_type][category][year_month] = {'yearMonth': year_month, 'units': 0, 'revenue': 0}
    customer_type_monthly[customer_type][category][year_month]['units'] += units
    customer_type_monthly[customer_type][category][year_month]['revenue'] += revenue

    # region_monthly
    if region not in region_monthly:
        region_monthly[region] = {}
    if year_month not in region_monthly[region]:
        region_monthly[region][year_month] = {'yearMonth': year_month, 'units': 0, 'revenue': 0}
    region_monthly[region][year_month]['units'] += units
    region_monthly[region][year_month]['revenue'] += revenue

    # sku_monthly
    if sku_id not in sku_monthly:
        sku_monthly[sku_id] = {}
    if year_month not in sku_monthly[sku_id]:
        sku_monthly[sku_id][year_month] = {'yearMonth': year_month, 'units': 0, 'revenue': 0}
    sku_monthly[sku_id][year_month]['units'] += units
    sku_monthly[sku_id][year_month]['revenue'] += revenue

# Convert to arrays
category_monthly_arr = {}
for cat, months in category_monthly.items():
    category_monthly_arr[cat] = sorted(months.values(), key=lambda x: x['yearMonth'])

customer_type_monthly_arr = {}
for ct, cats in customer_type_monthly.items():
    customer_type_monthly_arr[ct] = {}
    for cat, months in cats.items():
        customer_type_monthly_arr[ct][cat] = sorted(months.values(), key=lambda x: x['yearMonth'])

region_monthly_arr = {}
for r, months in region_monthly.items():
    region_monthly_arr[r] = sorted(months.values(), key=lambda x: x['yearMonth'])

sku_monthly_arr = {}
for sku, months in sku_monthly.items():
    sku_monthly_arr[sku] = sorted(months.values(), key=lambda x: x['yearMonth'])

# Compact sku daily aggregation
sku_daily = {}
for sku, records in sku_time_series.items():
    daily = {}
    for r in records:
        d = r['date']
        if d not in daily:
            daily[d] = {
                'date': d, 'units': 0, 'revenue': 0,
                'stockout_days': 0, 'promotion_days': 0,
                'count': 0, 'category': r['category']
            }
        daily[d]['units'] += r['units']
        daily[d]['revenue'] += r['revenue']
        if r['stockout']:
            daily[d]['stockout_days'] += 1
        if r['promotion']:
            daily[d]['promotion_days'] += 1
        daily[d]['count'] += 1
    sku_daily[sku] = sorted(daily.values(), key=lambda x: x['date'])

write_json('sku_daily.json', sku_daily)
write_json('category_monthly.json', category_monthly_arr)
write_json('customer_type_monthly.json', customer_type_monthly_arr)
write_json('region_monthly.json', region_monthly_arr)
write_json('sku_monthly.json', sku_monthly_arr)

# 8. Epidemiology data
regions_list = list(region_monthly_arr.keys())
epidemiology = []
start = datetime(2024, 6, 1)
for i in range(730):
    d = start + timedelta(days=i)
    ds = d.strftime('%Y-%m-%d')
    month = d.month - 1  # 0-based
    # Flu season peak in Northern hemisphere: Nov(10)-Mar(2)
    if month >= 10 or month <= 2:
        flu_base = 0.6 + (0.4 if month in [0, 11] else 0.2)
    else:
        flu_base = 0.05 + 0.05 * (month / 12)
    for region in regions_list:
        rf = 0.7 + random.random() * 0.6
        epidemiology.append({
            'date': ds,
            'region': region,
            'flu_index': round(flu_base * rf, 2),
            'covid_index': round(0.1 + random.random() * 0.15, 2),
            'respiratory_index': round((flu_base * 0.8 + 0.1) * rf, 2),
        })
write_json('epidemiology.json', epidemiology)

# 9. Generate policy impact baseline
policies = [
    {'id': 'vbp_2025', 'name': '第七批国家集采', 'name_en': '7th VBP Procurement', 'date': '2025-07-01', 'affected_categories': ['Western_Medicine'], 'price_cut_pct': 0.51, 'demand_shift_hospital': 1.35, 'demand_shift_pharmacy': 0.75},
    {'id': 'nrdl_2024', 'name': '2024医保目录调整', 'name_en': '2024 NRDL Update', 'date': '2025-01-01', 'affected_categories': ['Western_Medicine', 'TCM'], 'price_cut_pct': 0.15, 'demand_shift_hospital': 1.15, 'demand_shift_pharmacy': 1.10},
    {'id': 'drg_2025', 'name': 'DRG/DIP全面推广', 'name_en': 'DRG/DIP Expansion', 'date': '2025-04-01', 'affected_categories': ['Western_Medicine', 'Medical_Devices'], 'price_cut_pct': 0.08, 'demand_shift_hospital': 0.95, 'demand_shift_pharmacy': 1.20},
]
write_json('policies.json', policies)

print("\n✅ All data preprocessed successfully!")
print(f"Output directory: {OUT_DIR}")
