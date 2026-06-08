import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { dataEngine } from '../lib/dataEngine';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useNavigate } from 'react-router';
import { BarChart3, Truck, PackageSearch, Landmark, Bell, ArrowRight } from 'lucide-react';

const COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#f87171'];

export default function DashboardOverview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(() => dataEngine.loaded);

  useEffect(() => {
    if (!loaded) {
      dataEngine.init().then(() => setLoaded(true));
    }
  }, []);

  const skuCount = dataEngine.products.length;
  const activeCustomers = dataEngine.customers.filter(
    (c) => c.active_status === 'active'
  ).length;
  const totalCustomers = dataEngine.customers.length;
  const totalInventory = dataEngine.inventorySummary.reduce(
    (sum, i) => sum + i.total_qty,
    0
  );

  const monthlyForecast = useMemo(() => {
    if (dataEngine.categoryMonthly.length === 0) return 0;
    const months = [
      ...new Set(dataEngine.categoryMonthly.map((d) => d.year_month)),
    ].sort();
    const lastMonth = months[months.length - 1];
    return dataEngine.categoryMonthly
      .filter((d) => d.year_month === lastMonth)
      .reduce((sum, d) => sum + d.units, 0);
  }, [loaded]);

  const categoryTrendData = useMemo(() => {
    if (!loaded) return [];
    const months = [
      ...new Set(dataEngine.categoryMonthly.map((d) => d.year_month)),
    ].sort();
    const categories = [
      ...new Set(dataEngine.categoryMonthly.map((d) => d.category)),
    ];
    return months.map((month) => {
      const row: Record<string, number | string> = { year_month: month };
      categories.forEach((cat) => {
        const item = dataEngine.categoryMonthly.find(
          (d) => d.year_month === month && d.category === cat
        );
        row[cat] = item ? item.units : 0;
      });
      return row;
    });
  }, [loaded]);

  const categories = useMemo(() => {
    if (!loaded) return [];
    return [...new Set(dataEngine.categoryMonthly.map((d) => d.category))];
  }, [loaded]);

  const customerTypePieData = useMemo(() => {
    if (!loaded) return [];
    const map: Record<string, number> = {};
    dataEngine.customerTypeMonthly.forEach((d) => {
      map[d.customer_type] = (map[d.customer_type] || 0) + d.units;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [loaded]);

  const top10Inventory = useMemo(() => {
    if (!loaded) return [];
    return [...dataEngine.terminalInventory]
      .sort((a, b) => a.days_of_supply - b.days_of_supply)
      .slice(0, 10);
  }, [loaded]);

  const getStatusBadge = (days: number) => {
    if (days < 3) {
      return (
        <Badge className="bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25">
          {(t as Record<string, string>)['dash_status_critical'] || '缺货预警'}
        </Badge>
      );
    }
    if (days < 7) {
      return (
        <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/20 hover:bg-orange-500/25">
          {(t as Record<string, string>)['dash_status_warning'] || '库存紧张'}
        </Badge>
      );
    }
    if (days > 90) {
      return (
        <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25">
          {(t as Record<string, string>)['dash_status_overstock'] || '积压'}
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25">
        {(t as Record<string, string>)['dash_status_normal'] || '正常'}
      </Badge>
    );
  };

  if (!loaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0A0C10', color: '#E2E8F0' }}
      >
        <div className="text-lg">{(t as Record<string, string>)['dash_loading'] || '加载中...'}</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 space-y-6"
      style={{ backgroundColor: '#0A0C10', color: '#E2E8F0' }}
    >
      <div className="mb-2">
        <h1 className="text-2xl font-bold">
          {(t as Record<string, string>)['dash_overview_title'] || 'Dashboard 总览'}
        </h1>
        <p className="text-sm opacity-70 mt-1">
          {(t as Record<string, string>)['dash_overview_subtitle'] || '医药需求预测与智能补货系统核心指标监控'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {(t as Record<string, string>)['dash_kpi_sku'] || '覆盖SKU数量'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{skuCount.toLocaleString()}</div>
            <div className="mt-3">
              <Progress
                value={Math.min(100, (skuCount / 5000) * 100)}
                className="h-1.5 bg-gray-800"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {(t as Record<string, string>)['dash_kpi_active_customers'] || '活跃终端数'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {activeCustomers.toLocaleString()}
            </div>
            <div className="mt-3">
              <Progress
                value={
                  totalCustomers > 0
                    ? (activeCustomers / totalCustomers) * 100
                    : 0
                }
                className="h-1.5 bg-gray-800"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {(t as Record<string, string>)['dash_kpi_inventory'] || '总库存件数'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalInventory.toLocaleString()}
            </div>
            <div className="mt-3">
              <Progress
                value={Math.min(100, (totalInventory / 500000) * 100)}
                className="h-1.5 bg-gray-800"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {(t as Record<string, string>)['dash_kpi_forecast'] || '本月预测需求'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {monthlyForecast.toLocaleString()}
            </div>
            <div className="mt-3">
              <Progress
                value={Math.min(100, (monthlyForecast / 100000) * 100)}
                className="h-1.5 bg-gray-800"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { key: 'forecast', label: (t as Record<string, string>)['dash_forecast'] || '需求预测', icon: BarChart3, color: '#00D9C0', path: '/dashboard/forecast' },
          { key: 'replenishment', label: (t as Record<string, string>)['dash_replenishment'] || '智能补货', icon: Truck, color: '#0055FF', path: '/dashboard/replenishment' },
          { key: 'inventory', label: (t as Record<string, string>)['dash_inventory'] || '库存诊断', icon: PackageSearch, color: '#a78bfa', path: '/dashboard/inventory' },
          { key: 'policy', label: (t as Record<string, string>)['dash_policy'] || '政策模拟', icon: Landmark, color: '#fbbf24', path: '/dashboard/policy' },
          { key: 'alerts', label: (t as Record<string, string>)['dash_alerts'] || '预警推送', icon: Bell, color: '#f472b6', path: '/dashboard/alerts' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-800 bg-[#111318] hover:bg-white/5 transition-all text-left group"
            >
              <div className="p-2 rounded-md" style={{ backgroundColor: `${item.color}15` }}>
                <Icon size={18} style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-300 truncate">{item.label}</div>
              </div>
              <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </button>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
          <CardHeader>
            <CardTitle className="text-base">
              {(t as Record<string, string>)['dash_chart_category_trend'] || '品类销售趋势'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={categoryTrendData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  {categories.map((cat, i) => (
                    <linearGradient
                      key={cat}
                      id={`color-${cat}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={COLORS[i % COLORS.length]}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS[i % COLORS.length]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="year_month"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                  }}
                  itemStyle={{ color: '#E2E8F0' }}
                />
                <Legend wrapperStyle={{ color: '#E2E8F0' }} />
                {categories.map((cat, i) => (
                  <Area
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stroke={COLORS[i % COLORS.length]}
                    fillOpacity={1}
                    fill={`url(#color-${cat})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
          <CardHeader>
            <CardTitle className="text-base">
              {(t as Record<string, string>)['dash_chart_customer_type'] || '客户类型占比'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={customerTypePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {customerTypePieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                  }}
                  itemStyle={{ color: '#E2E8F0' }}
                  formatter={(value: number) => [value.toLocaleString(), '']}
                />
                <Legend wrapperStyle={{ color: '#E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Alert Table */}
      <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
        <CardHeader>
          <CardTitle className="text-base">
            {(t as Record<string, string>)['dash_inventory_alert_title'] || '库存预警 TOP10'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left py-3 px-4 font-medium">
                    {(t as Record<string, string>)['dash_col_sku'] || 'SKU编号'}
                  </th>
                  <th className="text-left py-3 px-4 font-medium">
                    {(t as Record<string, string>)['dash_col_customer'] || '终端编号'}
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    {(t as Record<string, string>)['dash_col_on_hand'] || '在库件数'}
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    {(t as Record<string, string>)['dash_col_days_supply'] || '可销天数'}
                  </th>
                  <th className="text-center py-3 px-4 font-medium">
                    {(t as Record<string, string>)['dash_col_status'] || '状态'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {top10Inventory.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs">
                      {item.sku_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {item.customer_id}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.on_hand_units.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.days_of_supply.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(item.days_of_supply)}
                    </td>
                  </tr>
                ))}
                {top10Inventory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      {(t as Record<string, string>)['dash_no_data'] || '暂无数据'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
