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
        title: '即将缺货',
        message: `${ti.sku_id} 在 ${ti.customer_id} 库存仅剩 ${ti.on_hand_units} 件，可销 ${Math.round(ti.days_of_supply)} 天`,
        metric_value: ti.days_of_supply,
        metric_unit: '天',
        suggested_action: '建议立即补货，数量：' + Math.ceil(ti.safety_stock * 3 - ti.on_hand_units),
      });
    }
    // Early warning: days of supply < 7
    else if (ti.days_of_supply < 7) {
      alerts.push({
        ...base,
        id: `ALT-${++idCounter}`,
        type: 'stockout',
        severity: 'warning',
        title: '库存偏低',
        message: `${ti.sku_id} 在 ${ti.customer_id} 可销天数不足7天`,
        metric_value: ti.days_of_supply,
        metric_unit: '天',
        suggested_action: '建议3日内安排补货',
      });
    }

    // 2. Overstock alert
    if (ti.days_of_supply > 90) {
      alerts.push({
        ...base,
        id: `ALT-${++idCounter}`,
        type: 'overstock',
        severity: 'warning',
        title: '库存积压',
        message: `${ti.sku_id} 在 ${ti.customer_id} 可销天数高达 ${Math.round(ti.days_of_supply)} 天`,
        metric_value: ti.days_of_supply,
        metric_unit: '天',
        suggested_action: '建议暂停采购，考虑调拨至缺货终端',
      });
    }

    // 3. Near expiry alert
    if (ti.near_expiry_units > 0) {
      alerts.push({
        ...base,
        id: `ALT-${++idCounter}`,
        type: 'near_expiry',
        severity: ti.near_expiry_units > ti.on_hand_units * 0.5 ? 'critical' : 'warning',
        title: '近效期预警',
        message: `${ti.sku_id} 在 ${ti.customer_id} 有 ${ti.near_expiry_units} 件近效期库存`,
        metric_value: ti.near_expiry_units,
        metric_unit: '件',
        suggested_action: '建议促销清仓或退货处理',
      });
    }

    // 4. Slow mover alert
    if (ti.average_daily_sales_30d < 0.05 && ti.on_hand_units > 10) {
      alerts.push({
        ...base,
        id: `ALT-${++idCounter}`,
        type: 'slow_mover',
        severity: 'info',
        title: '滞销品',
        message: `${ti.sku_id} 在 ${ti.customer_id} 30天日均销量仅 ${ti.average_daily_sales_30d}，库存 ${ti.on_hand_units} 件`,
        metric_value: ti.average_daily_sales_30d,
        metric_unit: '件/天',
        suggested_action: '建议调拨或退货',
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
            title: '流感季促销机会',
            message: `${flu.region} 地区流感指数 ${flu.flu_index}，${sku.sku_id} 库存充足可配合促销`,
            metric_value: flu.flu_index,
            metric_unit: '指数',
            suggested_action: '建议配合流感季开展促销活动',
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
