import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { dataEngine } from '../lib/dataEngine';
import { diagnoseInventory, type InventoryHealth, type TransferSuggestion } from '../lib/inventoryEngine';
import {
  Card, CardHeader, CardTitle, CardContent,
} from '@/components/ui/card';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  healthy: '#52C41A',
  hot: '#FF4D4F',
  slow: '#FAAD14',
  overstock: '#1890FF',
  shortage: '#FF4D4F',
  near_expiry: '#FAAD14',
  critical: '#720e1e',
};

export default function InventoryPage() {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(() => dataEngine.loaded);
  const [healthData, setHealthData] = useState<InventoryHealth[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [transfers, setTransfers] = useState<TransferSuggestion[]>([]);
  const _t = t as Record<string, string>;

  useEffect(() => {
    if (loaded) {
      diagnoseInventory().then(res => {
        setHealthData(res.healthList);
        setSummary(res.summary);
        setTransfers(res.transferSuggestions);
      });
    } else {
      dataEngine.init().then(() => {
        diagnoseInventory().then(res => {
          setHealthData(res.healthList);
          setSummary(res.summary);
          setTransfers(res.transferSuggestions);
          setLoaded(true);
        });
      });
    }
  }, []);

  const pieData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: _t['inventory_status_hot'] || 'Hot Seller', value: summary.hot_count, key: 'hot' },
      { name: _t['inventory_status_slow'] || 'Slow Mover', value: summary.slow_count, key: 'slow' },
      { name: _t['inventory_status_overstock'] || 'Overstock', value: summary.overstock_count, key: 'overstock' },
      { name: _t['inventory_status_shortage'] || 'Shortage', value: summary.shortage_count, key: 'shortage' },
      { name: _t['inventory_status_near_expiry'] || 'Near Expiry', value: summary.near_expiry_count, key: 'near_expiry' },
      { name: _t['inventory_status_critical'] || 'Critical', value: summary.critical_count, key: 'critical' },
      { name: _t['inventory_status_healthy'] || 'Healthy', value: summary.healthy_count, key: 'healthy' },
    ].filter(d => d.value > 0);
  }, [summary, _t]);

  const categoryBarData = useMemo(() => {
    if (!loaded) return [];
    const catMap: Record<string, { category: string; avg_days: number; count: number }> = {};
    dataEngine.terminalInventory.forEach(ti => {
      const p = dataEngine.getProduct(ti.sku_id);
      if (!p) return;
      if (!catMap[p.category]) catMap[p.category] = { category: p.category, avg_days: 0, count: 0 };
      catMap[p.category].avg_days += ti.days_of_supply;
      catMap[p.category].count += 1;
    });
    return Object.values(catMap).map(c => ({
      category: c.category,
      avg_days: Math.round((c.avg_days / c.count) * 10) / 10,
    }));
  }, [loaded]);

  const hotItems = useMemo(() => healthData.filter(h => h.status === 'hot'), [healthData]);
  const slowItems = useMemo(() => healthData.filter(h => h.status === 'slow' || h.status === 'overstock'), [healthData]);
  const expiryItems = useMemo(() => healthData.filter(h => h.near_expiry_units > 0), [healthData]);

  if (!loaded || !summary || healthData.length === 0) {
    return <div className="flex items-center justify-center h-96 text-slate-400">{(t as Record<string, string>)['inventory_loading'] || '加载中...'}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{(t as Record<string, string>)['inventory_title'] || '库存健康诊断'}</h1>
        <p className="text-sm opacity-70 mt-1">{(t as Record<string, string>)['inventory_subtitle'] || '分析终端库存结构，识别爆款、滞销、临期商品，给出优化建议'}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: (t as Record<string, string>)['inventory_kpi_total'] || '总SKU数', value: summary.total_skus, color: '#38bdf8' },
          { label: (t as Record<string, string>)['inventory_kpi_hot'] || '爆款数', value: summary.hot_count, color: '#FF4D4F' },
          { label: (t as Record<string, string>)['inventory_kpi_slow'] || '滞销数', value: summary.slow_count + summary.overstock_count, color: '#FAAD14' },
          { label: (t as Record<string, string>)['inventory_kpi_expiry'] || '临期库存数', value: summary.near_expiry_count, color: '#f472b6' },
        ].map(kpi => (
          <Card key={kpi.label} className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
            <CardContent className="pt-6">
              <div className="text-xs text-slate-400">{kpi.label}</div>
              <div className="text-3xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
          <CardHeader><CardTitle className="text-base">{(t as Record<string, string>)['inventory_status_dist'] || '库存状态分布'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" nameKey="name" stroke="none">
                  {pieData.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.key] || '#94a3b8'} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#E2E8F0' }} />
                <Legend wrapperStyle={{ color: '#E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
          <CardHeader><CardTitle className="text-base">{(t as Record<string, string>)['inventory_category_days'] || '各品类平均可销天数'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryBarData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="category" type="category" stroke="#6b7280" fontSize={11} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#E2E8F0' }} />
                <Bar dataKey="avg_days" fill="#0055FF" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="hot" className="w-full">
        <TabsList className="bg-[#111318] border border-gray-800">
          <TabsTrigger value="hot" className="data-[state=active]:bg-[#1f2937] text-slate-300">{(t as Record<string, string>)['inventory_tab_hot'] || '爆款热销'}</TabsTrigger>
          <TabsTrigger value="slow" className="data-[state=active]:bg-[#1f2937] text-slate-300">{(t as Record<string, string>)['inventory_tab_slow'] || '滞销库存'}</TabsTrigger>
          <TabsTrigger value="expiry" className="data-[state=active]:bg-[#1f2937] text-slate-300">{(t as Record<string, string>)['inventory_tab_expiry'] || '临期预警'}</TabsTrigger>
          <TabsTrigger value="transfer" className="data-[state=active]:bg-[#1f2937] text-slate-300">{(t as Record<string, string>)['inventory_tab_transfer'] || '调拨建议'}</TabsTrigger>
        </TabsList>

        <TabsContent value="hot">
          <InventoryTable items={hotItems} showRec />
        </TabsContent>
        <TabsContent value="slow">
          <InventoryTable items={slowItems} showRec />
        </TabsContent>
        <TabsContent value="expiry">
          <InventoryTable items={expiryItems} showExpiry />
        </TabsContent>
        <TabsContent value="transfer">
          <TransferTable items={transfers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InventoryTable({ items, showRec, showExpiry }: { items: InventoryHealth[]; showRec?: boolean; showExpiry?: boolean }) {
  const { t } = useTranslation();
  return (
    <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left py-3 px-3 font-medium">SKU</th>
                <th className="text-left py-3 px-3 font-medium">{(t as Record<string, string>)['inventory_col_customer'] || '终端'}</th>
                <th className="text-right py-3 px-3 font-medium">{(t as Record<string, string>)['inventory_col_on_hand'] || '在库'}</th>
                <th className="text-right py-3 px-3 font-medium">{(t as Record<string, string>)['inventory_col_days'] || '可销天数'}</th>
                <th className="text-right py-3 px-3 font-medium">{(t as Record<string, string>)['inventory_col_avg'] || '日均销量'}</th>
                {showExpiry && <th className="text-right py-3 px-3 font-medium">{(t as Record<string, string>)['inventory_col_near_expiry'] || '临期数'}</th>}
                {showRec && <th className="text-left py-3 px-3 font-medium">{(t as Record<string, string>)['inventory_col_recommendation'] || '建议'}</th>}
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 20).map((item, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 px-3 font-mono text-xs">{item.sku_id}</td>
                  <td className="py-3 px-3 font-mono text-xs">{item.customer_id}</td>
                  <td className="py-3 px-3 text-right">{item.on_hand}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={item.days_of_supply < 7 ? 'text-red-400' : item.days_of_supply > 90 ? 'text-blue-400' : 'text-slate-300'}>
                      {item.days_of_supply.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">{item.avg_daily_sales.toFixed(2)}</td>
                  {showExpiry && <td className="py-3 px-3 text-right text-yellow-400">{item.near_expiry_units}</td>}
                  {showRec && <td className="py-3 px-3 text-xs text-slate-400 max-w-xs truncate">{item.recommendation}</td>}
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={showRec ? 7 : showExpiry ? 6 : 5} className="py-8 text-center text-gray-500">{(t as Record<string, string>)['inventory_no_data'] || '暂无数据'}</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TransferTable({ items }: { items: TransferSuggestion[] }) {
  const { t } = useTranslation();
  return (
    <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left py-3 px-3 font-medium">SKU</th>
                <th className="text-left py-3 px-3 font-medium">{(t as Record<string, string>)['inventory_col_from'] || '调出终端'}</th>
                <th className="text-left py-3 px-3 font-medium">{(t as Record<string, string>)['inventory_col_to'] || '调入终端'}</th>
                <th className="text-right py-3 px-3 font-medium">{(t as Record<string, string>)['inventory_col_qty'] || '调拨数量'}</th>
                <th className="text-left py-3 px-3 font-medium">{(t as Record<string, string>)['inventory_col_reason'] || '原因'}</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 20).map((item, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 px-3 font-mono text-xs">{item.sku_id}</td>
                  <td className="py-3 px-3 font-mono text-xs">{item.from_customer_id} <span className="text-slate-500 text-[10px]">({item.from_customer_type})</span></td>
                  <td className="py-3 px-3 font-mono text-xs">{item.to_customer_id} <span className="text-slate-500 text-[10px]">({item.to_customer_type})</span></td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-medium">{item.transfer_qty}</td>
                  <td className="py-3 px-3 text-xs text-slate-400 max-w-xs truncate">{item.reason}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-500">{(t as Record<string, string>)['inventory_no_transfer'] || '暂无调拨建议'}</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
