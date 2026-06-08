import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { dataEngine } from '../lib/dataEngine';
import { generateReplenishmentRecommendations, type ReplenishmentItem } from '../lib/replenishmentEngine';
import {
  Card, CardHeader, CardTitle, CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Truck, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

const urgencyConfig: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertTriangle, label: '紧急' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: AlertCircle, label: '高' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertCircle, label: '中' },
  low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle, label: '低' },
};

export default function ReplenishmentPage() {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(() => dataEngine.loaded);
  const [items, setItems] = useState<ReplenishmentItem[]>([]);
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [generating, setGenerating] = useState(false);

  const customerTypes = ['all', 'public_hospital', 'chain_pharmacy', 'independent_pharmacy', 'primary_healthcare', 'clinic'];

  useEffect(() => {
    if (!loaded) {
      dataEngine.init().then(() => setLoaded(true));
    }
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const filter = customerTypeFilter === 'all' ? undefined : customerTypeFilter;
    const recs = await generateReplenishmentRecommendations(filter);
    setItems(recs);
    setGenerating(false);
  };

  const stats = {
    total: items.length,
    critical: items.filter(i => i.urgency === 'critical').length,
    high: items.filter(i => i.urgency === 'high').length,
    totalQty: items.reduce((s, i) => s + i.suggested_qty, 0),
  };

  if (!loaded) {
    return <div className="flex items-center justify-center h-96 text-slate-400">{(t as Record<string, string>)['replenishment_loading'] || '加载中...'}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{(t as Record<string, string>)['replenishment_title'] || '智能补货推荐'}</h1>
        <p className="text-sm opacity-70 mt-1">{(t as Record<string, string>)['replenishment_subtitle'] || '为各类终端生成定制化补货清单，推荐订货数量与最佳补货时间'}</p>
      </div>

      {/* Controls */}
      <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-56">
              <label className="text-xs text-slate-400 mb-1 block">{(t as Record<string, string>)['replenishment_customer_type'] || '客户类型'}</label>
              <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                <SelectTrigger className="bg-[#0A0C10] border-gray-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1f2937] border-gray-700">
                  {customerTypes.map(c => (
                    <SelectItem key={c} value={c} className="text-slate-200">
                      {c === 'all' ? ((t as Record<string, string>)['replenishment_all'] || '全部') : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="h-10 px-6"
              style={{ background: 'linear-gradient(135deg, #0055FF, #00D9C0)' }}
            >
              <Truck size={16} className="mr-2" />
              {generating ? ((t as Record<string, string>)['replenishment_generating'] || '生成中...') : ((t as Record<string, string>)['replenishment_generate'] || '生成补货方案')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: (t as Record<string, string>)['replenishment_stat_total'] || '推荐补货项', value: stats.total, color: '#38bdf8' },
              { label: (t as Record<string, string>)['replenishment_stat_critical'] || '紧急补货', value: stats.critical, color: '#FF4D4F' },
              { label: (t as Record<string, string>)['replenishment_stat_high'] || '高优先级', value: stats.high, color: '#FAAD14' },
              { label: (t as Record<string, string>)['replenishment_stat_qty'] || '建议总数量', value: stats.totalQty, color: '#34d399' },
            ].map(s => (
              <Card key={s.label} className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
                <CardContent className="pt-6">
                  <div className="text-xs text-slate-400">{s.label}</div>
                  <div className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Replenishment List */}
          <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
            <CardHeader>
              <CardTitle className="text-base">{(t as Record<string, string>)['replenishment_list_title'] || '补货推荐清单'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-auto pr-2">
                {items.slice(0, 50).map((item, idx) => {
                  const cfg = urgencyConfig[item.urgency];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${cfg.bg} ${cfg.border}`}
                    >
                      <div className={`p-2 rounded-md ${cfg.bg}`}>
                        <Icon size={18} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-slate-300">{item.sku_id}</span>
                          <Badge variant="outline" className="text-[10px] h-5 border-gray-700 text-slate-400">{item.category}</Badge>
                          <Badge className={`text-[10px] h-5 ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {item.customer_id} · {item.customer_type} · {(t as Record<string, string>)['replenishment_current_stock'] || '当前库存'}: {item.current_stock} · {(t as Record<string, string>)['replenishment_days_supply'] || '可销天数'}: {item.days_of_supply.toFixed(1)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-slate-200">{item.suggested_qty}</div>
                        <div className="text-[10px] text-slate-500">{(t as Record<string, string>)['replenishment_suggested_qty'] || '建议订货'}</div>
                      </div>
                      <div className="text-right shrink-0 w-24">
                        <div className="text-xs text-slate-300">{item.suggested_date}</div>
                        <div className="text-[10px] text-slate-500">{(t as Record<string, string>)['replenishment_suggested_date'] || '建议日期'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
