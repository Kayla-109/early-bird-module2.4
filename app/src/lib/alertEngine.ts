/**
 * Smart Alert & Early Warning Engine
 */

import { dataEngine } from './dataEngine';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertType = 'stockout' | 'overstock' | 'near_expiry' | 'slow_mover' | 'promotion_opportunity';

export interface AlertItem {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  customer_id: string;
  customer_type: string;
  sku_id: string;
  category: string;
  title: string;
  message: string;
  metric_value: number;
  metric_unit: string;
  suggested_action: string;
  timestamp: string;
  read: boolean;
}

export async function generateAlerts(): Promise<AlertItem[]> {
  await dataEngine.init();

  const alerts: AlertItem[] = [];
  const now = new Date().toISOString().slice(0, 10);
  let idCounter = 0;

  for (const ti of dataEngine.terminalInventory) {
    const product = dataEngine.getProduct(ti.sku_id);
    const customer = dataEngine.getCustomer(ti.customer_id);
    if (!product || !customer) continue;

    const base = {
      customer_id: ti.customer_id,
      customer_type: customer.customer_type,
      sku_id: ti.sku_id,
      category: product.category,
      timestamp: now,
      read: false,
    };

    // 1. Stockout alert
    if (ti.on_hand_units < ti.safety_stock || ti.days_of_supply < 3) {
      alerts.push({
        ...base,
        id: `ALT-${++idCounter}`,
        type: 'stockout',
        severity: 'critical',
        title: 'Stockout Alert',
        message: `${ti.sku_id} at ${ti.customer_id} has only ${ti.on_hand_units} units left, ${Math.round(ti.days_of_supply)} days of supply remaining`,
        metric_value: ti.days_of_supply,
        metric_unit: 'days',
        suggested_action: 'Immediate replenishment recommended: ' + Math.ceil(ti.safety_stock * 3 - ti.on_hand_units) + ' units',
      });
    }
    // Early warning: days of supply < 7
    else if (ti.days_of_supply < 7) {
      alerts.push({
        ...base,
        id: `ALT-${++idCounter}`,
        type: 'stockout',
        severity: 'warning',
        title: 'Low Stock Warning',
        message: `${ti.sku_id} at ${ti.customer_id} has less than 7 days of supply`,
        metric_value: ti.days_of_supply,
        metric_unit: 'days',
        suggested_action: 'Schedule replenishment within 3 days',
      });
    }

    // 2. Overstock alert
    if (ti.days_of_supply > 90) {
      alerts.push({
        ...base,
        id: `ALT-${++idCounter}`,
        type: 'overstock',
        severity: 'warning',
        title: 'Overstock Alert',
        message: `${ti.sku_id} at ${ti.customer_id} has ${Math.round(ti.days_of_supply)} days of supply`,
        metric_value: ti.days_of_supply,
        metric_unit: 'days',
        suggested_action: 'Pause procurement and consider transferring to shortage terminals',
      });
    }

    // 3. Near expiry alert
    if (ti.near_expiry_units > 0) {
      alerts.push({
        ...base,
        id: `ALT-${++idCounter}`,
        type: 'near_expiry',
        severity: ti.near_expiry_units > ti.on_hand_units * 0.5 ? 'critical' : 'warning',
        title: 'Near Expiry Alert',
        message: `${ti.sku_id} at ${ti.customer_id} has ${ti.near_expiry_units} near-expiry units`,
        metric_value: ti.near_expiry_units,
        metric_unit: 'units',
        suggested_action: 'Promote clearance or process returns',
      });
    }

    // 4. Slow mover alert
    if (ti.average_daily_sales_30d < 0.05 && ti.on_hand_units > 10) {
      alerts.push({
        ...base,
        id: `ALT-${++idCounter}`,
        type: 'slow_mover',
        severity: 'info',
        title: 'Slow Mover',
        message: `${ti.sku_id} at ${ti.customer_id} 30-day avg daily sales only ${ti.average_daily_sales_30d}, inventory ${ti.on_hand_units} units`,
        metric_value: ti.average_daily_sales_30d,
        metric_unit: 'units/day',
        suggested_action: 'Consider transfer or return',
      });
    }
  }

  // 5. Promotion opportunity: high flu index regions
  const fluData = dataEngine.epidemiology.filter(e => e.date === now);
  for (const flu of fluData) {
    if (flu.flu_index > 0.8) {
      // Find antiviral / respiratory related SKUs (Western_Medicine category)
      const respSkus = dataEngine.products.filter(p => p.category === 'Western_Medicine').slice(0, 5);
      for (const sku of respSkus) {
        const ti = dataEngine.terminalInventory.find(t => t.sku_id === sku.sku_id);
        if (ti && ti.days_of_supply > 14 && ti.days_of_supply < 60) {
          alerts.push({
            id: `ALT-${++idCounter}`,
            type: 'promotion_opportunity',
            severity: 'info',
            customer_id: ti.customer_id,
            customer_type: dataEngine.getCustomer(ti.customer_id)?.customer_type || '',
            sku_id: sku.sku_id,
            category: sku.category,
            title: 'Flu Season Promotion Opportunity',
            message: `${flu.region} flu index ${flu.flu_index}, ${sku.sku_id} has sufficient inventory for promotion`,
            metric_value: flu.flu_index,
            metric_unit: 'index',
            suggested_action: 'Launch flu season promotion campaign',
            timestamp: now,
            read: false,
          });
        }
      }
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

export function getUnreadCount(alerts: AlertItem[]): number {
  return alerts.filter(a => !a.read).length;
}

export function getAlertsByType(alerts: AlertItem[]): Record<AlertType, AlertItem[]> {
  const byType: Record<string, AlertItem[]> = {
    stockout: [],
    overstock: [],
    near_expiry: [],
    slow_mover: [],
    promotion_opportunity: [],
  };
  for (const a of alerts) {
    byType[a.type].push(a);
  }
  return byType as Record<AlertType, AlertItem[]>;
}
