import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { dataEngine } from '../lib/dataEngine';
import {
  forecastCategoryDemand, forecastSkuDemand,
  backtestCategoryDemand, backtestSkuDemand,
  type ForecastResult, type BacktestResult,
} from '../lib/forecastEngine';
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
  const [skuId, setSkuId] = useState<string>('__ALL__');
  const [horizon, setHorizon] = useState(30);
  const [customerType, setCustomerType] = useState('chain_pharmacy');

  const [backtestData, setBacktestData] = useState<BacktestResult | null>(null);
  const [forecastData, setForecastData] = useState<ForecastResult | null>(null);
  const [skuForecasts, setSkuForecasts] = useState<{ sku_id: string; category: string; forecast14: number; forecast30: number; avgDaily: number; confidence: number }[]>([]);

  const categories = useMemo(() => loaded ? dataEngine.getCategories() : [], [loaded]);
  const customerTypes = useMemo(() => loaded ? dataEngine.getCustomerTypes() : [], [loaded]);
  const skusInCategory = useMemo(() => {
    if (!loaded) return [];
    return dataEngine.products.filter(p => p.category === category).map(p => p.sku_id);
  }, [loaded, category]);

  // Reset SKU when category changes
  useEffect(() => {
    setSkuId('__ALL__');
  }, [category]);

  // Load backtest + forecast data
  useEffect(() => {
    if (!loaded) return;

    const isCategoryMode = skuId === '__ALL__';

    if (isCategoryMode) {
      backtestCategoryDemand(category, 30, customerType).then(setBacktestData);
      forecastCategoryDemand(category, horizon, customerType).then(setForecastData);
    } else {
      backtestSkuDemand(skuId, 30, customerType).then(setBacktestData);
      forecastSkuDemand(skuId, horizon, customerType).then(setForecastData);
    }

    if (isCategoryMode) {
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
    } else {
      setSkuForecasts([]);
    }
  }, [loaded, category, skuId, horizon, customerType]);

  const backtestChartData = useMemo(() => {
    if (!backtestData) return [];
    return backtestData.points.map((p, i) => ({ ...p, date: p.date, _index: i }));
  }, [backtestData]);

  const forecastChartData = useMemo(() => {
    if (!forecastData) return [];
    return forecastData.points.filter((_, i) => i % 3 === 0).map(p => ({
      date: p.date.slice(5),
      forecast: p.finalForecast,
      lower: p.lowerBound,
      upper: p.upperBound,
      seasonal: p.seasonalFactor,
      epidemic: p.epidemicFactor,
      policy: p.policyFactor,
    }));
  }, [forecastData]);

  const factorValues = useMemo(() => {
    const lastFc = forecastData?.points?.[forecastData.points.length - 1];
    if (!lastFc) return { seasonal: 1, epidemic: 1, policy: 1, promotion: 1 };
    return {
      seasonal: lastFc.seasonalFactor,
      epidemic: lastFc.epidemicFactor,
      policy: lastFc.policyFactor,
      promotion: lastFc.promotionFactor,
    };
  }, [forecastData]);

  if (!loaded) {
    return <div className="flex items-center justify-center h-96 text-slate-400">{(t as Record<string, string>)['forecast_loading'] || 'Loading...'}</div>;
  }

  const isCategoryMode = skuId === '__ALL__';
  const _t = t as Record<string, string>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{_t['forecast_title'] || 'Multi-Factor Demand Forecast'}</h1>
        <p className="text-sm opacity-70 mt-1">{_t['forecast_subtitle'] || 'Forecasting future demand'}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <div className="w-48">
          <label className="text-xs text-slate-400 mb-1 block">{_t['forecast_category'] || 'Category'}</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-[#111318] border-gray-700 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1f2937] border-gray-700">
              {categories.map(c => <SelectItem key={c} value={c} className="text-slate-200">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <label className="text-xs text-slate-400 mb-1 block">SKU</label>
          <Select value={skuId} onValueChange={setSkuId}>
            <SelectTrigger className="bg-[#111318] border-gray-700 text-slate-200">
              <SelectValue placeholder={_t['forecast_sku_placeholder'] || 'Select SKU'} />
            </SelectTrigger>
            <SelectContent className="bg-[#1f2937] border-gray-700 max-h-60">
              <SelectItem value="__ALL__" className="text-slate-200 font-medium">📊 {_t['forecast_select_all'] || 'Category Total'}</SelectItem>
              {skusInCategory.map(sku => <SelectItem key={sku} value={sku} className="text-slate-200 font-mono text-xs">{sku}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <label className="text-xs text-slate-400 mb-1 block">{_t['forecast_horizon'] || 'Forecast Horizon'}</label>
          <Select value={String(horizon)} onValueChange={v => setHorizon(Number(v))}>
            <SelectTrigger className="bg-[#111318] border-gray-700 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1f2937] border-gray-700">
              <SelectItem value="14" className="text-slate-200">14 {_t['forecast_days_short'] || 'Days'}</SelectItem>
              <SelectItem value="30" className="text-slate-200">30 {_t['forecast_days_short'] || 'Days'}</SelectItem>
              <SelectItem value="60" className="text-slate-200">60 {_t['forecast_days_short'] || 'Days'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <label className="text-xs text-slate-400 mb-1 block">{_t['forecast_customer_type'] || 'Customer Type'}</label>
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

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Historical Backtest */}
        <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">📈 {_t['forecast_backtest_title'] || 'Historical Accuracy Validation (30-Day Backtest)'}</CardTitle>
              {backtestData && backtestData.mape > 0 && (
                <Badge className={backtestData.mape < 15 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : backtestData.mape < 30 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}>
                  MAPE: {backtestData.mape.toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {_t['forecast_backtest_legend'] || 'Blue bars = Actual | Green line = Backtest Prediction | Red dashed = Bounds'}
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={backtestChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="btArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D9C0" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#00D9C0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#E2E8F0' }} />
                <Legend wrapperStyle={{ color: '#E2E8F0', fontSize: 12 }} />
                <Bar dataKey="actual" name={_t['forecast_actual'] || 'Actual Sales'} fill="#0055FF" radius={[4, 4, 0, 0]} barSize={16} />
                <Area type="monotone" dataKey="predicted" name={_t['forecast_forecast'] || 'Backtest Prediction'} stroke="#00D9C0" fill="url(#btArea)" strokeWidth={2} />
                <Line type="monotone" dataKey="lowerBound" name={_t['forecast_lower'] || 'Lower Bound'} stroke="#f87171" strokeDasharray="4 4" dot={false} strokeWidth={1} />
                <Line type="monotone" dataKey="upperBound" name={_t['forecast_upper'] || 'Upper Bound'} stroke="#f87171" strokeDasharray="4 4" dot={false} strokeWidth={1} />
              </ComposedChart>
            </ResponsiveContainer>
            {backtestData && (
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span>{_t['forecast_backtest_rmse'] || 'RMSE'}: <span className="text-slate-300 font-mono">{backtestData.rmse}</span></span>
                <span>{_t['forecast_backtest_mape'] || 'MAPE'}: <span className="text-slate-300 font-mono">{backtestData.mape}%</span></span>
                <span className="ml-auto">{_t['forecast_backtest_desc'] || 'Model trained on earlier data, validated against last 30 days'}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Future Forecast */}
        <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🔮 {_t['forecast_future_title']?.replace('{days}', String(horizon)) || `Future Demand Forecast (Next ${horizon} Days)`}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              {_t['forecast_future_subtitle'] || 'Integrating seasonality, epidemiology, policy, and promotion factors'}
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={forecastChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                <Legend wrapperStyle={{ color: '#E2E8F0', fontSize: 12 }} />
                <Area type="monotone" dataKey="forecast" name={_t['forecast_forecast'] || 'Forecast'} stroke="#00D9C0" fill="url(#fcArea)" strokeWidth={2} />
                <Line type="monotone" dataKey="lower" name={_t['forecast_lower'] || 'Lower Bound'} stroke="#f87171" strokeDasharray="4 4" dot={false} strokeWidth={1} />
                <Line type="monotone" dataKey="upper" name={_t['forecast_upper'] || 'Upper Bound'} stroke="#f87171" strokeDasharray="4 4" dot={false} strokeWidth={1} />
              </ComposedChart>
            </ResponsiveContainer>
            {forecastData && (
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span>{_t['forecast_total_predicted'] || 'Total Predicted'}: <span className="text-emerald-400 font-mono">{forecastData.totalPredicted.toFixed(1)}</span></span>
                <span>{_t['forecast_daily_avg'] || 'Daily Avg'}: <span className="text-emerald-400 font-mono">{forecastData.avgDaily.toFixed(2)}</span></span>
                <span>{_t['forecast_confidence_label'] || 'Confidence'}: <span className="text-emerald-400 font-mono">{(forecastData.confidence * 100).toFixed(1)}%</span></span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Factor Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'seasonal', labelKey: 'factor_seasonal', color: '#a78bfa', icon: '📅' },
          { key: 'epidemic', labelKey: 'factor_epidemic', color: '#f472b6', icon: '🦠' },
          { key: 'policy', labelKey: 'factor_policy', color: '#fbbf24', icon: '🏛️' },
          { key: 'promotion', labelKey: 'factor_promotion', color: '#34d399', icon: '🏷️' },
        ].map(f => {
          const val = (factorValues as any)[f.key] || 1.0;
          return (
            <Card key={f.key} className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-xs text-slate-400">{_t[f.labelKey] || f.key}</span>
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

      {/* Bottom Section */}
      {isCategoryMode ? (
        <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
          <CardHeader>
            <CardTitle className="text-base">{_t['forecast_sku_table'] || 'SKU-Level Forecast TOP10'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="text-left py-3 px-4 font-medium">SKU</th>
                    <th className="text-right py-3 px-4 font-medium">{_t['sku_table_forecast_14'] || '14-Day Forecast'}</th>
                    <th className="text-right py-3 px-4 font-medium">{_t['sku_table_forecast_30'] || '30-Day Forecast'}</th>
                    <th className="text-right py-3 px-4 font-medium">{_t['forecast_avg_daily'] || 'Avg Daily'}</th>
                    <th className="text-right py-3 px-4 font-medium">{_t['forecast_confidence'] || 'Confidence'}</th>
                  </tr>
                </thead>
                <tbody>
                  {skuForecasts.map(s => (
                    <tr key={s.sku_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer" onClick={() => setSkuId(s.sku_id)}>
                      <td className="py-3 px-4 font-mono text-xs text-sky-400 hover:underline">{s.sku_id}</td>
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
      ) : (
        <SkuDetailPanel skuId={skuId} forecastData={forecastData} backtestData={backtestData} />
      )}
    </div>
  );
}

/* SKU Detail Panel */
function SkuDetailPanel({ skuId, forecastData, backtestData }: {
  skuId: string;
  forecastData: ForecastResult | null;
  backtestData: BacktestResult | null;
}) {
  const product = useMemo(() => dataEngine.getProduct(skuId), [skuId]);
  const inventory = useMemo(() => dataEngine.getTerminalInventoryForSku(skuId), [skuId]);

  const totalInventory = useMemo(() => inventory.reduce((s, i) => s + i.on_hand_units, 0), [inventory]);
  const avgDailySales = useMemo(() => inventory.length > 0
    ? inventory.reduce((s, i) => s + i.average_daily_sales_30d, 0) / inventory.length
    : 0, [inventory]);
  const daysOfSupply = avgDailySales > 0 ? totalInventory / avgDailySales : 0;

  const _t = (useTranslation().t) as Record<string, string>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* SKU Basic Info */}
      <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
        <CardHeader>
          <CardTitle className="text-base">📋 {_t['sku_info_title'] || 'SKU Basic Info'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-xs text-slate-400">SKU ID</span>
            <span className="font-mono text-xs text-slate-200">{skuId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-slate-400">{_t['sku_info_category'] || 'Category'}</span>
            <span className="text-xs text-slate-200">{product?.category || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-slate-400">{_t['sku_info_storage_temp'] || 'Storage Temp'}</span>
            <span className="text-xs text-slate-200">{product?.storage_temperature || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-slate-400">{_t['sku_info_shelf_life'] || 'Shelf Life'}</span>
            <span className="text-xs text-slate-200">{product?.shelf_life_days || '-'} {_t['sku_info_days'] || 'days'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-slate-400">{_t['sku_info_unit_price'] || 'Unit Price'}</span>
            <span className="text-xs text-slate-200">¥{product?.unit_price_rmb || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-slate-400">{_t['sku_info_abc_class'] || 'ABC Class'}</span>
            <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/20 text-xs">{product?.abc_class || '-'}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Status */}
      <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
        <CardHeader>
          <CardTitle className="text-base">📦 {_t['sku_inventory_title'] || 'Inventory Status'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-200">{totalInventory.toFixed(0)}</div>
            <div className="text-xs text-slate-400 mt-1">{_t['sku_inventory_total'] || 'Total Inventory (units)'}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-gray-800/40">
              <div className="text-lg font-semibold text-slate-200">{avgDailySales.toFixed(2)}</div>
              <div className="text-xs text-slate-400">{_t['sku_inventory_daily_sales'] || 'Avg Daily Sales'}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-800/40">
              <div className={`text-lg font-semibold ${daysOfSupply < 14 ? 'text-red-400' : daysOfSupply < 30 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {daysOfSupply.toFixed(1)}
              </div>
              <div className="text-xs text-slate-400">{_t['sku_inventory_days_supply'] || 'Days of Supply'}</div>
            </div>
          </div>
          {forecastData && (
            <div className="pt-2 border-t border-gray-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{_t['sku_inventory_forecast_30d'] || '30-Day Forecast Demand'}</span>
                <span className="text-emerald-400 font-mono">{forecastData.totalPredicted.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-slate-400">{_t['sku_inventory_gap_surplus'] || 'Projected Gap/Surplus'}</span>
                <span className={`font-mono ${totalInventory - forecastData.totalPredicted < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {(totalInventory - forecastData.totalPredicted).toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prediction Metrics */}
      <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
        <CardHeader>
          <CardTitle className="text-base">🎯 {_t['sku_metrics_title'] || 'Forecast Metrics'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {forecastData && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{_t['sku_metrics_forecast_14d'] || '14-Day Forecast'}</span>
                <span className="text-sm font-mono text-slate-200">{(forecastData.avgDaily * 14).toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{_t['sku_metrics_forecast_30d'] || '30-Day Forecast'}</span>
                <span className="text-sm font-mono text-emerald-400">{forecastData.totalPredicted.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{_t['sku_metrics_daily_avg'] || 'Daily Avg Forecast'}</span>
                <span className="text-sm font-mono text-slate-200">{forecastData.avgDaily.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{_t['sku_metrics_confidence'] || 'Model Confidence'}</span>
                <Badge className={forecastData.confidence > 0.8 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : forecastData.confidence > 0.6 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}>
                  {(forecastData.confidence * 100).toFixed(1)}%
                </Badge>
              </div>
            </>
          )}
          {backtestData && backtestData.mape > 0 && (
            <div className="pt-2 border-t border-gray-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{_t['sku_metrics_mape'] || 'Backtest MAPE'}</span>
                <span className={`text-sm font-mono ${backtestData.mape < 15 ? 'text-emerald-400' : backtestData.mape < 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {backtestData.mape.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{_t['sku_metrics_rmse'] || 'Backtest RMSE'}</span>
                <span className="text-sm font-mono text-slate-200">{backtestData.rmse.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {_t['sku_metrics_hint'] || 'MAPE < 15% excellent, 15-30% good, > 30% needs improvement'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
