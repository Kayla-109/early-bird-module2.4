import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { dataEngine } from '../lib/dataEngine';
import { simulatePolicyImpact, getDefaultScenarios, type PolicyScenario, type PolicyImpactResult } from '../lib/policyEngine';
import {
  Card, CardHeader, CardTitle, CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Landmark, Play, RotateCcw } from 'lucide-react';

export default function PolicyPage() {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(() => dataEngine.loaded);
  const [scenario, setScenario] = useState<PolicyScenario>(getDefaultScenarios()[0]);
  const [priceCut, setPriceCut] = useState(51);
  const [hospitalShift, setHospitalShift] = useState(135);
  const [pharmacyShift, setPharmacyShift] = useState(75);
  const [results, setResults] = useState<PolicyImpactResult[]>([]);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!loaded) {
      dataEngine.init().then(() => setLoaded(true));
    }
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    const customScenario: PolicyScenario = {
      ...scenario,
      price_cut_pct: priceCut / 100,
      demand_shift_hospital: hospitalShift / 100,
      demand_shift_pharmacy: pharmacyShift / 100,
    };
    const res = await simulatePolicyImpact(customScenario, 12);
    setResults(res);
    setSimulating(false);
  };

  const handleReset = () => {
    const s = getDefaultScenarios()[0];
    setScenario(s);
    setPriceCut(Math.round(s.price_cut_pct * 100));
    setHospitalShift(Math.round(s.demand_shift_hospital * 100));
    setPharmacyShift(Math.round(s.demand_shift_pharmacy * 100));
    setResults([]);
  };

  if (!loaded) {
    return <div className="flex items-center justify-center h-96 text-slate-400">{(t as Record<string, string>)['policy_loading'] || '加载中...'}</div>;
  }

  const scenarios = getDefaultScenarios();

  // Build combined chart data for the first result category
  const monthlyChartData = results.length > 0 ? results[0].monthly_series.map(m => ({
    month: m.month,
    baseline_units: m.baseline_units,
    simulated_units: m.simulated_units,
    baseline_revenue: Math.round(m.baseline_revenue / 10000),
    simulated_revenue: Math.round(m.simulated_revenue / 10000),
  })) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{(t as Record<string, string>)['policy_title'] || '政策影响模拟'}</h1>
        <p className="text-sm opacity-70 mt-1">{(t as Record<string, string>)['policy_subtitle'] || '构建模型，模拟药品集采等政策变动对各类药品需求的影响'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scenario Controls */}
        <Card className="border-gray-800/60 lg:col-span-1" style={{ backgroundColor: '#111318' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark size={18} className="text-yellow-400" />
              {(t as Record<string, string>)['policy_scenario'] || '政策场景'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-xs text-slate-400 mb-2 block">{(t as Record<string, string>)['policy_select'] || '选择政策'}</label>
              <div className="space-y-2">
                {scenarios.map(s => (
                  <button
                    key={s.policy_id}
                    onClick={() => {
                      setScenario(s);
                      setPriceCut(Math.round(s.price_cut_pct * 100));
                      setHospitalShift(Math.round(s.demand_shift_hospital * 100));
                      setPharmacyShift(Math.round(s.demand_shift_pharmacy * 100));
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-xs transition-all border ${
                      scenario.policy_id === s.policy_id
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                        : 'border-gray-800 bg-transparent text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <div className="font-medium">{s.name_en}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{s.name} · {s.effective_date}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                {(t as Record<string, string>)['policy_price_cut'] || '降价幅度'}: {priceCut}%
              </label>
              <Slider value={[priceCut]} onValueChange={v => setPriceCut(v[0])} max={80} step={1} className="py-2" />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                {(t as Record<string, string>)['policy_hospital_shift'] || '医院需求变化'}: {hospitalShift}%
              </label>
              <Slider value={[hospitalShift]} onValueChange={v => setHospitalShift(v[0])} max={200} step={5} className="py-2" />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                {(t as Record<string, string>)['policy_pharmacy_shift'] || '药店需求变化'}: {pharmacyShift}%
              </label>
              <Slider value={[pharmacyShift]} onValueChange={v => setPharmacyShift(v[0])} max={200} step={5} className="py-2" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSimulate} disabled={simulating} className="flex-1 h-9" style={{ background: 'linear-gradient(135deg, #0055FF, #00D9C0)' }}>
                <Play size={14} className="mr-1.5" />
                {simulating ? ((t as Record<string, string>)['policy_simulating'] || '模拟中...') : ((t as Record<string, string>)['policy_run'] || '运行模拟')}
              </Button>
              <Button onClick={handleReset} variant="outline" className="h-9 border-gray-700 text-slate-300 hover:bg-white/5">
                <RotateCcw size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {results.length === 0 && (
            <Card className="border-gray-800/60 h-80 flex items-center justify-center" style={{ backgroundColor: '#111318' }}>
              <div className="text-center text-slate-500">
                <Landmark size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{(t as Record<string, string>)['policy_hint'] || '配置政策参数并运行模拟，查看对各类药品需求的影响'}</p>
              </div>
            </Card>
          )}

          {results.map((res, idx) => (
            <Card key={idx} className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{res.category}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={res.revenue_change_pct >= 0 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}>
                      {(t as Record<string, string>)['policy_revenue'] || '收入'} {res.revenue_change_pct > 0 ? '+' : ''}{res.revenue_change_pct}%
                    </Badge>
                    <Badge className={res.units_change_pct >= 0 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}>
                      {(t as Record<string, string>)['policy_units'] || '销量'} {res.units_change_pct > 0 ? '+' : ''}{res.units_change_pct}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 rounded-md bg-white/5">
                    <div className="text-[10px] text-slate-500">{(t as Record<string, string>)['policy_baseline_units'] || '基线销量'}</div>
                    <div className="text-lg font-bold text-slate-200">{res.baseline_units.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-md bg-white/5">
                    <div className="text-[10px] text-slate-500">{(t as Record<string, string>)['policy_simulated_units'] || '模拟销量'}</div>
                    <div className="text-lg font-bold text-slate-200">{res.simulated_units.toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-md bg-white/5">
                    <div className="text-[10px] text-slate-500">{(t as Record<string, string>)['policy_hospital_impact'] || '医院影响'}</div>
                    <div className="text-lg font-bold text-slate-200">{res.hospital_impact > 0 ? '+' : ''}{res.hospital_impact}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {monthlyChartData.length > 0 && (
            <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
              <CardHeader>
                <CardTitle className="text-base">{(t as Record<string, string>)['policy_monthly_trend'] || '月度销量对比趋势'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#E2E8F0' }} />
                    <Legend wrapperStyle={{ color: '#E2E8F0' }} />
                    <Bar dataKey="baseline_units" name={(t as Record<string, string>)['policy_baseline'] || '基线'} fill="#6b7280" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="simulated_units" name={(t as Record<string, string>)['policy_simulated'] || '模拟'} fill="#00D9C0" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
