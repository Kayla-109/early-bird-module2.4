/**
 * Inventory Health Diagnosis Engine
 */

import { dataEngine, type TerminalInventory, type Product } from './dataEngine';

export interface InventoryHealth {
  customer_id: string;
  sku_id: string;
  product: Product | undefined;
  on_hand: number;
  days_of_supply: number;
  avg_daily_sales: number;
  reorder_point: number;
  safety_stock: number;
  near_expiry_units: number;
  health_score: number; // 0-100
  status: 'healthy' | 'hot' | 'slow' | 'overstock' | 'shortage' | 'near_expiry' | 'critical';
  recommendation: string;
}

export interface TransferSuggestion {
  sku_id: string;
  from_customer_id: string;
  from_customer_type: string;
  to_customer_id: string;
  to_customer_type: string;
  transfer_qty: number;
  reason: string;
}

export async function diagnoseInventory(): Promise<{
  healthList: InventoryHealth[];
  summary: {
    total_skus: number;
    hot_count: number;
    slow_count: number;
    overstock_count: number;
    shortage_count: number;
    near_expiry_count: number;
    critical_count: number;
    healthy_count: number;
    avg_health_score: number;
  };
  transferSuggestions: TransferSuggestion[];
}> {
  await dataEngine.init();

  const healthList: InventoryHealth[] = [];
  let hot_count = 0, slow_count = 0, overstock_count = 0, shortage_count = 0,
      near_expiry_count = 0, critical_count = 0, healthy_count = 0;
  let totalScore = 0;

  for (const ti of dataEngine.terminalInventory) {
    const product = dataEngine.getProduct(ti.sku_id);
    dataEngine.getCustomer(ti.customer_id);

    let status: InventoryHealth['status'] = 'healthy';
    let health_score = 70;
    const recs: string[] = [];

    const daysSupply = ti.days_of_supply;
    const avgDaily = ti.average_daily_sales_30d;
    const reorder = ti.reorder_point;
    const safety = ti.safety_stock;
    const onHand = ti.on_hand_units;

    // Hot seller: high velocity, low days of supply
    if (avgDaily > 2 && daysSupply < 7) {
      status = 'hot';
      hot_count++;
      health_score = 50;
      recs.push('爆款热销，建议紧急补货');
    }
    // Shortage
    else if (onHand < safety || daysSupply < 3) {
      status = 'shortage';
      shortage_count++;
      health_score = 20;
      recs.push('库存严重不足，建议立即补货');
    }
    // Near expiry
    else if (ti.near_expiry_units > 0) {
      status = 'near_expiry';
      near_expiry_count++;
      health_score = 40;
      recs.push(`存在${ti.near_expiry_units}件近效期库存，建议促销清仓`);
    }
    // Slow mover
    else if (avgDaily < 0.1 && daysSupply > 60) {
      status = 'slow';
      slow_count++;
      health_score = 35;
      recs.push('滞销品，建议调拨或退货');
    }
    // Overstock
    else if (daysSupply > 90) {
      status = 'overstock';
      overstock_count++;
      health_score = 45;
      recs.push('库存积压，建议暂停采购并调拨');
    }
    // Critical: multiple issues
    else if (onHand < safety && ti.near_expiry_units > 0) {
      status = 'critical';
      critical_count++;
      health_score = 10;
      recs.push('多重风险：缺货+临期，需紧急处理');
    }
    else {
      healthy_count++;
      health_score = 85 + Math.min(15, Math.floor((30 - daysSupply) / 2));
      recs.push('库存健康');
    }

    totalScore += health_score;

    healthList.push({
      customer_id: ti.customer_id,
      sku_id: ti.sku_id,
      product,
      on_hand: onHand,
      days_of_supply: daysSupply,
      avg_daily_sales: avgDaily,
      reorder_point: reorder,
      safety_stock: safety,
      near_expiry_units: ti.near_expiry_units,
      health_score,
      status,
      recommendation: recs.join('；'),
    });
  }

  // Transfer suggestions: find SKU with high in one terminal, low in another
  const transferSuggestions: TransferSuggestion[] = [];
  const skuGroups: Record<string, TerminalInventory[]> = {};
  for (const ti of dataEngine.terminalInventory) {
    if (!skuGroups[ti.sku_id]) skuGroups[ti.sku_id] = [];
    skuGroups[ti.sku_id].push(ti);
  }

  for (const sku_id in skuGroups) {
    const terminals = skuGroups[sku_id];
    if (terminals.length < 2) continue;
    terminals.sort((a, b) => a.days_of_supply - b.days_of_supply);
    const lowest = terminals[0];
    const highest = terminals[terminals.length - 1];
    if (highest.days_of_supply > lowest.days_of_supply * 5 && highest.days_of_supply > 30 && lowest.days_of_supply < 10) {
      const transferQty = Math.min(
        Math.floor(highest.on_hand_units * 0.3),
        Math.max(1, Math.floor(lowest.safety_stock * 2 - lowest.on_hand_units))
      );
      if (transferQty > 0) {
        const fromCust = dataEngine.getCustomer(highest.customer_id);
        const toCust = dataEngine.getCustomer(lowest.customer_id);
        transferSuggestions.push({
          sku_id,
          from_customer_id: highest.customer_id,
          from_customer_type: fromCust?.customer_type || '',
          to_customer_id: lowest.customer_id,
          to_customer_type: toCust?.customer_type || '',
          transfer_qty: transferQty,
          reason: `库存不均：${highest.customer_id}(${Math.round(highest.days_of_supply)}天) → ${lowest.customer_id}(${Math.round(lowest.days_of_supply)}天)`,
        });
      }
    }
  }

  const total_skus = healthList.length;
  return {
    healthList,
    summary: {
      total_skus,
      hot_count,
      slow_count,
      overstock_count,
      shortage_count,
      near_expiry_count,
      critical_count,
      healthy_count,
      avg_health_score: total_skus > 0 ? Math.round(totalScore / total_skus) : 0,
    },
    transferSuggestions,
  };
}
