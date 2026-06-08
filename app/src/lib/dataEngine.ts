/**
 * Data Engine - Loads and processes simulation CSV data
 * All data is fetched from /data/*.csv at runtime
 */

export interface Product {
  sku_id: string;
  category: string;
  storage_temperature: string;
  shelf_life_days: number;
  unit_price_rmb: number;
  abc_class: string;
  near_expiry_managed: boolean;
  batch_tracking_required: boolean;
  hazardous_or_controlled_flag: boolean;
  unit_volume_liters: number;
  unit_weight_kg: number;
  manufacturer_id: string;
}

export interface Customer {
  customer_id: string;
  customer_type: string;
  province: string;
  city: string;
  urban_rural_flag: string;
  store_size: string;
  monthly_patient_volume: number;
  average_order_frequency_days: number;
  service_level_target: number;
  credit_tier: string;
  b2b_registered: boolean;
  active_status: string;
}

export interface Warehouse {
  warehouse_id: string;
  province: string;
  city: string;
  warehouse_type: string;
  total_area_sqm: number;
  ambient_zone_bins: number;
  cool_zone_bins: number;
  cold_zone_bins: number;
  frozen_zone_bins: number;
  controlled_zone_bins: number;
  max_capacity_units: number;
  active_pickers: number;
  peak_picker_capacity: number;
  next_day_delivery_rate_pct: number;
  daily_order_capacity: number;
}

export interface TerminalInventory {
  customer_id: string;
  sku_id: string;
  inventory_date: string;
  on_hand_units: number;
  reserved_units: number;
  average_daily_sales_30d: number;
  days_of_supply: number;
  reorder_point: number;
  safety_stock: number;
  last_replenishment_date: string;
  near_expiry_units: number;
}

export interface InventorySummary {
  sku_id: string;
  warehouse_id: string;
  total_qty: number;
  reserved_qty: number;
  batches: number;
  near_expiry_qty: number;
  expired_qty: number;
  min_days_to_expiry: number;
}

export interface SkuDaily {
  sku_id: string;
  date: string;
  units: number;
  revenue: number;
  stockout_count: number;
  promotion_count: number;
  order_count: number;
}

export interface CategoryMonthly {
  category: string;
  year_month: string;
  units: number;
  revenue: number;
  orders: number;
}

export interface CustomerTypeMonthly {
  customer_type: string;
  category: string;
  year_month: string;
  units: number;
  revenue: number;
}

export interface RegionMonthly {
  region: string;
  year_month: string;
  units: number;
  revenue: number;
}

export interface SkuMonthly {
  sku_id: string;
  year_month: string;
  units: number;
  revenue: number;
}

export interface EpidemiologyData {
  date: string;
  region: string;
  flu_index: number;
  covid_index: number;
  respiratory_index: number;
}

export interface Policy {
  policy_id: string;
  name: string;
  name_en: string;
  effective_date: string;
  affected_categories: string;
  price_cut_pct: number;
  demand_shift_hospital: number;
  demand_shift_pharmacy: number;
}

export interface OrderStats {
  total_orders: number;
  total_lines: number;
  total_units: number;
  by_customer_type: Record<string, { orders: number; lines: number; units: number }>;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
}

class DataEngine {
  private cache: Map<string, any> = new Map();
  loaded = false;

  products: Product[] = [];
  productMap: Map<string, Product> = new Map();
  customers: Customer[] = [];
  customerMap: Map<string, Customer> = new Map();
  warehouses: Warehouse[] = [];
  terminalInventory: TerminalInventory[] = [];
  inventorySummary: InventorySummary[] = [];
  skuDaily: SkuDaily[] = [];
  categoryMonthly: CategoryMonthly[] = [];
  customerTypeMonthly: CustomerTypeMonthly[] = [];
  regionMonthly: RegionMonthly[] = [];
  skuMonthly: SkuMonthly[] = [];
  epidemiology: EpidemiologyData[] = [];
  policies: Policy[] = [];
  // Order stats can be computed from loaded data if needed

  async init() {
    if (this.loaded) return;
    const [products, customers, warehouses, terminalInv, invSummary, skuDaily, catMonthly, ctMonthly, regMonthly, skuMonthly, epi, policies] = await Promise.all([
      this.loadCSV<Product>('products.csv'),
      this.loadCSV<Customer>('customers.csv'),
      this.loadCSV<Warehouse>('warehouses.csv'),
      this.loadCSV<TerminalInventory>('terminal_inventory.csv'),
      this.loadCSV<InventorySummary>('inventory_batches_summary.csv'),
      this.loadCSV<SkuDaily>('sku_daily.csv'),
      this.loadCSV<CategoryMonthly>('category_monthly.csv'),
      this.loadCSV<CustomerTypeMonthly>('customer_type_monthly.csv'),
      this.loadCSV<RegionMonthly>('region_monthly.csv'),
      this.loadCSV<SkuMonthly>('sku_monthly.csv'),
      this.loadCSV<EpidemiologyData>('epidemiology.csv'),
      this.loadCSV<Policy>('policies.csv'),
    ]);

    this.products = products;
    this.products.forEach(p => this.productMap.set(p.sku_id, p));
    this.customers = customers;
    this.customers.forEach(c => this.customerMap.set(c.customer_id, c));
    this.warehouses = warehouses;
    this.terminalInventory = terminalInv;
    this.inventorySummary = invSummary;
    this.skuDaily = skuDaily;
    this.categoryMonthly = catMonthly;
    this.customerTypeMonthly = ctMonthly;
    this.regionMonthly = regMonthly;
    this.skuMonthly = skuMonthly;
    this.epidemiology = epi;
    this.policies = policies;
    this.loaded = true;
  }

  private async loadCSV<T>(filename: string): Promise<T[]> {
    if (this.cache.has(filename)) return this.cache.get(filename);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${base}/data/${filename}`);
      const text = await res.text();
      const lines = text.trim().split('\n');
      if (lines.length <= 1) return [];
      const fileHeaders = lines[0].split(',');
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: any = {};
        fileHeaders.forEach((h, i) => {
          const key = h.trim();
          const v = values[i]?.trim();
          if (v === undefined) return;
          if (v === 'True') obj[key] = true;
          else if (v === 'False') obj[key] = false;
          else if (!isNaN(Number(v)) && v !== '') {
            const n = Number(v);
            obj[key] = Number.isInteger(n) ? n : n;
          }
          else obj[key] = v;
        });
        return obj as T;
      });
      this.cache.set(filename, data);
      return data;
    } catch (e) {
      console.error(`Failed to load ${filename}:`, e);
      return [];
    }
  }

  getProduct(sku_id: string): Product | undefined {
    return this.productMap.get(sku_id);
  }

  getCustomer(customer_id: string): Customer | undefined {
    return this.customerMap.get(customer_id);
  }

  getCategories(): string[] {
    return [...new Set(this.products.map(p => p.category))];
  }

  getCustomerTypes(): string[] {
    return [...new Set(this.customers.map(c => c.customer_type))];
  }

  getRegions(): string[] {
    return [...new Set(this.regionMonthly.map(r => r.region))];
  }

  getSkuDailyByCategory(category: string): SkuDaily[] {
    const skus = new Set(this.products.filter(p => p.category === category).map(p => p.sku_id));
    return this.skuDaily.filter(d => skus.has(d.sku_id));
  }

  getSkuDaily(sku_id: string): SkuDaily[] {
    return this.skuDaily.filter(d => d.sku_id === sku_id).sort((a, b) => a.date.localeCompare(b.date));
  }

  getSkuMonthly(sku_id: string): SkuMonthly[] {
    return this.skuMonthly.filter(d => d.sku_id === sku_id).sort((a, b) => a.year_month.localeCompare(b.year_month));
  }

  getTerminalInventoryForCustomer(customerId: string): TerminalInventory[] {
    return this.terminalInventory.filter(t => t.customer_id === customerId);
  }

  getTerminalInventoryForSku(skuId: string): TerminalInventory[] {
    return this.terminalInventory.filter(t => t.sku_id === skuId);
  }
}

export const dataEngine = new DataEngine();
