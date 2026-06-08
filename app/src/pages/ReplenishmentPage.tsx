import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { dataEngine } from '../lib/dataEngine';
import { generateReplenishmentRecommendations, type ReplenishmentItem } from '../lib/replenishmentEngine';
import {
  Card, CardHeader, CardTitle, CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Truck, AlertTriangle, AlertCircle, CheckCircle, RefreshCw, Search, X } from 'lucide-react';

function getUrgencyConfig(t: Record<string, string>) {
  return {
    critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertTriangle, label: t['urgency_critical'] || 'Critical' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: AlertCircle, label: t['urgency_high'] || 'High' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertCircle, label: t['urgency_medium'] || 'Medium' },
    low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle, label: t['urgency_low'] || 'Low' },
  };
}

export default function ReplenishmentPage() {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(() => dataEngine.loaded);
  const [items, setItems] = useState<ReplenishmentItem[]>([]);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string[]>(['critical', 'high', 'medium', 'low']);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const _t = t as Record<string, string>;
  const urgencyConfig = getUrgencyConfig(_t);

  const customerTypes = ['all', 'public_hospital', 'chain_pharmacy', 'independent_pharmacy', 'primary_healthcare', 'clinic'];
  const urgencyKeys = ['critical', 'high', 'medium', 'low'];

  // Initialize data engine
  useEffect(() => {
    if (!loaded) {
      dataEngine.init().then(() => setLoaded(true));
    }
  }, []);

  // Auto-generate on first load
  useEffect(() => {
    if (loaded && items.length === 0) {
      handleGenerate();
    }
  }, [loaded]);

  // Update category filter options when data loads
  const availableCategories = useMemo(() => {
    if (!loaded) return [];
    return dataEngine.getCategories();
  }, [loaded]);

  useEffect(() => {
    if (availableCategories.length > 0 && categoryFilter.length === 0) {
      setCategoryFilter(availableCategories);
    }
  }, [availableCategories]);

  const handleGenerate = async () => {
    setGenerating(true);
    const filter = customerTypeFilter === 'all' ? undefined : customerTypeFilter;
    const recs = await generateReplenishmentRecommendations(filter);
    setItems(recs);
    setGenerating(false);
  };

  // Toggle urgency filter
  const toggleUrgency = (urgency: string) => {
    setUrgencyFilter(prev =>
      prev.includes(urgency)
        ? prev.filter(u => u !== urgency)
        : [...prev, urgency]
    );
  };

  // Toggle category filter
  const toggleCategory = (cat: string) => {
    setCategoryFilter(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  // Real-time filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (!urgencyFilter.includes(item.urgency)) return false;
      if (!categoryFilter.includes(item.category)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.sku_id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, urgencyFilter, categoryFilter, searchQuery]);

  const stats = {
    total: filteredItems.length,
    critical: filteredItems.filter(i => i.urgency === 'critical').length,
    high: filteredItems.filter(i => i.urgency === 'high').length,
    totalQty: filteredItems.reduce((s, i) => s + i.suggested_qty, 0),
  };

  if (!loaded) {
    return <div className="flex items-center justify-center h-96 text-slate-400">{_t['replenishment_loading'] || 'Loading...'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{_t['replenishment_title'] || 'Intelligent Replenishment'}</h1>
        <p className="text-sm opacity-70 mt-1">{_t['replenishment_subtitle'] || 'Generate customized replenishment lists with optimal order quantities and timing'}</p>
      </div>

      {/* Filter Bar */}
      <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
        <CardContent className="pt-6 space-y-4">
          {/* Row 1: Customer type + Search + Refresh */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <label className="text-xs text-slate-400 mb-1 block">{_t['replenishment_filter_customer_type'] || 'Customer Type'}</label>
              <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                <SelectTrigger className="bg-[#0A0C10] border-gray-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1f2937] border-gray-700">
                  {customerTypes.map(c => (
                    <SelectItem key={c} value={c} className="text-slate-200">
                      {c === 'all' ? (_t['replenishment_all'] || 'All') : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-64">
              <label className="text-xs text-slate-400 mb-1 block">{_t['replenishment_search_sku'] || 'Search SKU'}</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={_t['replenishment_search_placeholder'] || 'Enter SKU ID to search...'}
                  className="pl-9 bg-[#0A0C10] border-gray-700 text-slate-200 placeholder:text-slate-600"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="h-10 px-5"
              style={{ background: 'linear-gradient(135deg, #0055FF, #00D9C0)' }}
            >
              <RefreshCw size={14} className={`mr-2 ${generating ? 'animate-spin' : ''}`} />
              {generating ? (_t['replenishment_refreshing'] || 'Refreshing...') : (_t['replenishment_refresh'] || 'Refresh Data')}
            </Button>
          </div>

          {/* Row 2: Urgency filter */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">{_t['replenishment_filter_urgency'] || 'Priority Filter'}</label>
            <div className="flex flex-wrap gap-2">
              {urgencyKeys.map(key => {
                const cfg = urgencyConfig[key as keyof typeof urgencyConfig];
                const selected = urgencyFilter.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleUrgency(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-all ${
                      selected
                        ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                        : 'bg-gray-800/40 border-gray-700 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <cfg.icon size={12} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Category filter */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">{_t['replenishment_filter_category'] || 'Category Filter'}</label>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map(cat => {
                const selected = categoryFilter.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-md text-xs border transition-all ${
                      selected
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        : 'bg-gray-800/40 border-gray-700 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { labelKey: 'replenishment_stat_total', value: stats.total, color: '#38bdf8' },
          { labelKey: 'replenishment_stat_critical', value: stats.critical, color: '#FF4D4F' },
          { labelKey: 'replenishment_stat_high', value: stats.high, color: '#FAAD14' },
          { labelKey: 'replenishment_stat_qty', value: stats.totalQty, color: '#34d399' },
        ].map(s => (
          <Card key={s.labelKey} className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
            <CardContent className="pt-6">
              <div className="text-xs text-slate-400">{_t[s.labelKey] || s.labelKey}</div>
              <div className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Replenishment List */}
      <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{_t['replenishment_list_title'] || 'Replenishment Recommendations'}</CardTitle>
            <span className="text-xs text-slate-500">{_t['replenishment_showing'] || 'Showing'} {filteredItems.length} / {items.length} {_t['replenishment_items'] || 'items'}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-auto pr-2">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Truck size={32} className="mx-auto mb-3 opacity-30" />
                <p>{_t['replenishment_no_results'] || 'No matching replenishment suggestions'}</p>
                <p className="text-xs mt-1">{_t['replenishment_try_adjust'] || 'Try adjusting filters'}</p>
              </div>
            ) : (
              filteredItems.slice(0, 100).map((item, idx) => {
                const cfg = urgencyConfig[item.urgency as keyof typeof urgencyConfig];
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
                        {item.customer_id} · {item.customer_type} · {_t['replenishment_current_stock'] || 'Current Stock'}: {item.current_stock} · {_t['replenishment_days_supply'] || 'Days Supply'}: {item.days_of_supply.toFixed(1)} · {item.reason}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-slate-200">{item.suggested_qty}</div>
                      <div className="text-[10px] text-slate-500">{_t['replenishment_suggested_qty'] || 'Suggested Order'}</div>
                    </div>
                    <div className="text-right shrink-0 w-24">
                      <div className="text-xs text-slate-300">{item.suggested_date}</div>
                      <div className="text-[10px] text-slate-500">{_t['replenishment_suggested_date'] || 'Suggested Date'}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
