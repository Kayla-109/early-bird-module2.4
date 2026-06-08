/**
 * Intelligent Replenishment Recommendation Engine
 */

import { dataEngine } from './dataEngine';
import { forecastSkuDemand } from './forecastEngine';

export interface ReplenishmentItem {
  customer_id: string;
  customer_type: string;
  sku_id: string;
  category: string;
  current_stock: number;
  safety_stock: number;
  reorder_point: number;
  avg_daily_sales: number;
  days_of_supply: number;
  forecast_14d: number;
  forecast_30d: number;
  suggested_qty: number;
  suggested_date: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

export async function generateReplenishmentRecommendations(
  customerTypeFilter?: string
): Promise<ReplenishmentItem[]> {
  await dataEngine.init();

  const items: ReplenishmentItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // Filter customers
  const customers = customerTypeFilter
    ? dataEngine.customers.filter(c => c.customer_type === customerTypeFilter)
    : dataEngine.customers;

  const customerIds = new Set(customers.map(c => c.customer_id));

  for (const ti of dataEngine.terminalInventory) {
    if (!customerIds.has(ti.customer_id)) continue;

    const product = dataEngine.getProduct(ti.sku_id);
    if (!product) continue;

    const customer = dataEngine.getCustomer(ti.customer_id);
    const customerType = customer?.customer_type || 'unknown';

    // Quick estimation first
    let forecast14 = ti.average_daily_sales_30d * 14;
    let forecast30 = ti.average_daily_sales_30d * 30;

    // Only run detailed forecast for items that likely need replenishment
    const likelyNeedsReplenishment = ti.days_of_supply < 20 || ti.on_hand_units < ti.safety_stock * 3;
    if (likelyNeedsReplenishment) {
      try {
        const f14 = await forecastSkuDemand(ti.sku_id, 14, customerType);
        const f30 = await forecastSkuDemand(ti.sku_id, 30, customerType);
        forecast14 = f14.totalPredicted;
        forecast30 = f30.totalPredicted;
      } catch {
        // Keep fallback estimates
      }
    }

    // Calculate suggested quantity
    const suggestedQty = Math.max(0, Math.ceil(forecast30 + ti.safety_stock - ti.on_hand_units));

    // Determine urgency and suggested date
    let urgency: ReplenishmentItem['urgency'] = 'low';
    let suggestedDate = today;
    let reason = '';

    const daysLeft = ti.days_of_supply;

    if (daysLeft < 3 || ti.on_hand_units < ti.safety_stock) {
      urgency = 'critical';
      suggestedDate = today;
      reason = daysLeft < 3 ? 'Days of supply less than 3' : 'Stock below safety level';
    } else if (daysLeft < 7) {
      urgency = 'high';
      suggestedDate = addDays(today, 1);
      reason = 'Days of supply less than 7';
    } else if (daysLeft < 14) {
      urgency = 'medium';
      suggestedDate = addDays(today, 3);
      reason = 'Days of supply less than 14';
    } else if (suggestedQty > 0) {
      urgency = 'low';
      suggestedDate = addDays(today, 7);
      reason = 'Regular replenishment cycle';
    }

    if (suggestedQty > 0) {
      items.push({
        customer_id: ti.customer_id,
        customer_type: customerType,
        sku_id: ti.sku_id,
        category: product.category,
        current_stock: ti.on_hand_units,
        safety_stock: ti.safety_stock,
        reorder_point: ti.reorder_point,
        avg_daily_sales: ti.average_daily_sales_30d,
        days_of_supply: ti.days_of_supply,
        forecast_14d: Math.round(forecast14 * 100) / 100,
        forecast_30d: Math.round(forecast30 * 100) / 100,
        suggested_qty: suggestedQty,
        suggested_date: suggestedDate,
        urgency,
        reason,
      });
    }
  }

  // Sort by urgency then by suggested qty desc
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  items.sort((a, b) => {
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return b.suggested_qty - a.suggested_qty;
  });

  return items;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
