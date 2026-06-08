import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { dataEngine } from '../lib/dataEngine';
import { forecastCategoryDemand, forecastSkuDemand } from '../lib/forecastEngine';
import {
  Card, CardHeader, CardTitle, CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, Legend, Bar, ComposedChart,
} from 'recharts';

export default function ForecastPage() {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(() => dataEngine.loaded);

  useEffect(() => {
    if (!loaded) {
      dataEngine.init().then(() => setLoaded(true));
    }
  }, []);

  const [category, setCategory] = useState('Western_Medicine');
  const [horizon, setHorizon] = useState(30);
  const [customerType, setCustomerType] = useState('chain_pharmacy');
  const [forecastData, setForecastData] = useState<{ date: string; actual?: number; forecast?: number; lower?: number; upper?: number; seasonal?: number; epidemic?: number; policy?: number }[]>([]);
  const [skuForecasts, setSkuForecasts] = useState<{ sku_id: string; category: string; forecast14: number; forecast30: number; avgDaily: number; confidence: number }[]>([]);

  const categories = useMemo(() => loaded ? dataEngine.getCategories() : [], [loaded]);
  const customerTypes = useMemo(() => loaded ? dataEngine.getCustomerTypes() : [], [loaded]);

  useEffect(() => {
    if (!loaded) return;

    forecastCategoryDemand(category, horizon, customerType).then(fc => {
      const chartData: typeof forecastData = [];
      // Add forecast points (daily, sampled weekly)
      fc.points.forEach((p, i) => {
        if (i % 3 === 0) { // Every 3 days to keep chart readable
          chartData.push({
            date: p.date.slice(5),
            forecast: p.finalForecast,
            lower: p.lowerBound,
            upper: p.upperBound,
            seasonal: p.seasonalFactor,
            epidemic: p.epidemicFactor,
            policy: p.policyFactor,
          });
        }
      });
      setForecastData(chartData);
    });

    // SKU-level forecasts: top 10 SKUs by recent sales
    const skus = dataEngine.products.filter(p => p.category === category).map(p => p.sku_id);
    const skuPromises = skus.slice(0, 10).map(async sku_id => {
      const f14 = await forecastSkuDemand(sku_id, 14, customerType);
      const f30 = await forecastSkuDemand(sku_id, 30, customerType);
      return {
        sku_id,
        category: f14.category,
        forecast14: f14.totalPredicted,
        forecast30: f30.totalPredicted,
        avgDaily: f14.avgDaily,
        confidence: f14.confidence,
      };
    });
    Promise.all(skuPromises).then(setSkuForecasts);
  }, [loaded, category, horizon, customerType]);

  if (!loaded) {
    return <div className="flex items-center justify-center h-96 text-slate-400">{(t as Record<string, string>)['forecast_loading'] || '加载中...'}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{(t as Record<string, string>)['forecast_title'] || '多因子需求预测'}</h1>
        <p className="text-sm opacity-70 mt-1">{(t as Record<string, string>)['forecast_subtitle'] || '融合季节特征、流行病学数据、政策变化与历史销量，预测未来需求'}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <div className="w-48">
          <label className="text-xs text-slate-400 mb-1 block">{(t as Record<string, string>)['forecast_category'] || '品类'}</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-[#111318] border-gray-700 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1f2937] border-gray-700">
              {categories.map(c => <SelectItem key={c} value={c} className="text-slate-200">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <label className="text-xs text-slate-400 mb-1 block">{(t as Record<string, string>)['forecast_horizon'] || '预测周期'}</label>
          <Select value={String(horizon)} onValueChange={v => setHorizon(Number(v))}>
            <SelectTrigger className="bg-[#111318] border-gray-700 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1f2937] border-gray-700">
              <SelectItem value="14" className="text-slate-200">14 {(t as Record<string, string>)['forecast_days'] || '天'}</SelectItem>
              <SelectItem value="30" className="text-slate-200">30 {(t as Record<string, string>)['forecast_days'] || '天'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <label className="text-xs text-slate-400 mb-1 block">{(t as Record<string, string>)['forecast_customer_type'] || '客户类型'}</label>
          <Select value={customerType} onValueChange={setCustomerType}>
            <SelectTrigger className="bg-[#111318] border-gray-700 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1f2937] border-gray-700">
              {customerTypes.map(c => <SelectItem key={c} value={c} className="text-slate-200">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Forecast Chart */}
      <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
        <CardHeader>
          <CardTitle className="text-base">{(t as Record<string, string>)['forecast_chart_title'] || '需求预测趋势'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={forecastData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fcArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D9C0" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00D9C0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#E2E8F0' }} />
              <Legend wrapperStyle={{ color: '#E2E8F0' }} />
              <Bar dataKey="actual" name={(t as Record<string, string>)['forecast_actual'] || '历史日均'} fill="#0055FF" radius={[4, 4, 0, 0]} barSize={20} />
              <Area type="monotone" dataKey="forecast" name={(t as Record<string, string>)['forecast_forecast'] || '预测'} stroke="#00D9C0" fill="url(#fcArea)" strokeWidth={2} />
              <Line type="monotone" dataKey="lower" name={(t as Record<string, string>)['forecast_lower'] || '下限'} stroke="#f87171" strokeDasharray="4 4" dot={false} strokeWidth={1} />
              <Line type="monotone" dataKey="upper" name={(t as Record<string, string>)['forecast_upper'] || '上限'} stroke="#f87171" strokeDasharray="4 4" dot={false} strokeWidth={1} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Factor Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'seasonal', label: (t as Record<string, string>)['factor_seasonal'] || '季节性因子', color: '#a78bfa', icon: '📅' },
          { key: 'epidemic', label: (t as Record<string, string>)['factor_epidemic'] || '流行病学因子', color: '#f472b6', icon: '🦠' },
          { key: 'policy', label: (t as Record<string, string>)['factor_policy'] || '政策因子', color: '#fbbf24', icon: '🏛️' },
          { key: 'promotion', label: (t as Record<string, string>)['factor_promotion'] || '促销因子', color: '#34d399', icon: '🏷️' },
        ].map(f => {
          const lastFc = forecastData.filter(d => d.forecast !== undefined).pop();
          const val = lastFc ? (lastFc as any)[f.key] || 1.0 : 1.0;
          return (
            <Card key={f.key} className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-xs text-slate-400">{f.label}</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: f.color }}>{val.toFixed(2)}x</div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, val * 50)}%`, backgroundColor: f.color }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* SKU Forecast Table */}
      <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
        <CardHeader>
          <CardTitle className="text-base">{(t as Record<string, string>)['forecast_sku_table'] || 'SKU级预测 TOP10'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left py-3 px-4 font-medium">SKU</th>
                  <th className="text-right py-3 px-4 font-medium">14天预测</th>
                  <th className="text-right py-3 px-4 font-medium">30天预测</th>
                  <th className="text-right py-3 px-4 font-medium">{(t as Record<string, string>)['forecast_avg_daily'] || '日均'}</th>
                  <th className="text-right py-3 px-4 font-medium">{(t as Record<string, string>)['forecast_confidence'] || '置信度'}</th>
                </tr>
              </thead>
              <tbody>
                {skuForecasts.map(s => (
                  <tr key={s.sku_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-3 px-4 font-mono text-xs">{s.sku_id}</td>
                    <td className="py-3 px-4 text-right">{s.forecast14.toFixed(1)}</td>
                    <td className="py-3 px-4 text-right">{s.forecast30.toFixed(1)}</td>
                    <td className="py-3 px-4 text-right">{s.avgDaily.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <Badge className={s.confidence > 0.8 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : s.confidence > 0.6 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}>
                        {(s.confidence * 100).toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
