import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { dataEngine } from '../lib/dataEngine';
import { generateAlerts, getAlertsByType, type AlertItem, type AlertSeverity, type AlertType } from '../lib/alertEngine';
import {
  Card, CardHeader, CardTitle, CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, PackageSearch, TrendingUp, Clock, Thermometer } from 'lucide-react';

const typeConfig: Record<AlertType, { icon: any; label: string; color: string }> = {
  stockout: { icon: PackageSearch, label: '缺货预警', color: '#FF4D4F' },
  overstock: { icon: TrendingUp, label: '积压告警', color: '#1890FF' },
  near_expiry: { icon: Clock, label: '临期预警', color: '#FAAD14' },
  slow_mover: { icon: Thermometer, label: '滞销提醒', color: '#6b7280' },
  promotion_opportunity: { icon: Bell, label: '促销机会', color: '#34d399' },
};

const severityConfig: Record<AlertSeverity, { icon: any; bg: string; border: string; text: string }> = {
  critical: { icon: AlertTriangle, bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
  warning: { icon: AlertCircle, bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
  info: { icon: Info, bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
};

export default function AlertsPage() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loaded, setLoaded] = useState(() => dataEngine.loaded);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (loaded) {
      generateAlerts().then(data => {
        setAlerts(data);
      });
    } else {
      dataEngine.init().then(() => {
        generateAlerts().then(data => {
          setAlerts(data);
          setLoaded(true);
        });
      });
    }
  }, []);

  const byType = getAlertsByType(alerts);

  const filtered = activeTab === 'all' ? alerts : byType[activeTab as AlertType] || [];

  const unreadCount = alerts.filter(a => !a.read).length;

  const markAllRead = () => setAlerts(prev => prev.map(a => ({ ...a, read: true })));

  if (!loaded) {
    return <div className="flex items-center justify-center h-96 text-slate-400">{(t as Record<string, string>)['alerts_loading'] || '加载中...'}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{(t as Record<string, string>)['alerts_title'] || '智能预警推送'}</h1>
          <p className="text-sm opacity-70 mt-1">{(t as Record<string, string>)['alerts_subtitle'] || '对即将缺货、库存过量积压的商品主动发出预警通知'}</p>
        </div>
        <Button onClick={markAllRead} variant="outline" className="border-gray-700 text-slate-300 hover:bg-white/5 h-9">
          <CheckCircle size={14} className="mr-1.5" />
          {(t as Record<string, string>)['alerts_mark_all'] || '全部标为已读'}
        </Button>
      </div>

      {/* Alert Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { key: 'all', label: (t as Record<string, string>)['alerts_all'] || '全部', count: alerts.length, color: '#38bdf8' },
          { key: 'stockout', label: (t as Record<string, string>)['alerts_stockout'] || '缺货', count: byType.stockout.length, color: '#FF4D4F' },
          { key: 'overstock', label: (t as Record<string, string>)['alerts_overstock'] || '积压', count: byType.overstock.length, color: '#1890FF' },
          { key: 'near_expiry', label: (t as Record<string, string>)['alerts_expiry'] || '临期', count: byType.near_expiry.length, color: '#FAAD14' },
          { key: 'slow_mover', label: (t as Record<string, string>)['alerts_slow'] || '滞销', count: byType.slow_mover.length, color: '#6b7280' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`p-3 rounded-lg border text-left transition-all ${
              activeTab === item.key
                ? 'border-cyan-500/30 bg-cyan-500/10'
                : 'border-gray-800 bg-[#111318] hover:bg-white/5'
            }`}
          >
            <div className="text-xs text-slate-400">{item.label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color: item.color }}>{item.count}</div>
          </button>
        ))}
      </div>

      {/* Alert List */}
      <Card className="border-gray-800/60" style={{ backgroundColor: '#111318' }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell size={16} className="text-yellow-400" />
            {(t as Record<string, string>)['alerts_list'] || '预警列表'}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5">{unreadCount} {(t as Record<string, string>)['alerts_unread'] || '未读'}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-auto pr-2">
            {filtered.map(alert => {
              const typeCfg = typeConfig[alert.type];
              const sevCfg = severityConfig[alert.severity];
              const TypeIcon = typeCfg.icon;
              const SevIcon = sevCfg.icon;
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    alert.read ? 'border-gray-800/50 opacity-60' : `${sevCfg.bg} ${sevCfg.border}`
                  }`}
                >
                  <div className="mt-0.5">
                    <TypeIcon size={16} style={{ color: typeCfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${alert.read ? 'text-slate-500' : 'text-slate-200'}`}>{alert.title}</span>
                      <Badge className={`text-[10px] h-5 ${sevCfg.bg} ${sevCfg.text} ${sevCfg.border}`}>
                        <SevIcon size={10} className="mr-1" />
                        {alert.severity === 'critical' ? '紧急' : alert.severity === 'warning' ? '警告' : '提示'}
                      </Badge>
                      {!alert.read && <div className="w-2 h-2 rounded-full bg-red-500" />}
                    </div>
                    <div className={`text-xs mt-1 ${alert.read ? 'text-slate-600' : 'text-slate-400'}`}>{alert.message}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-slate-500">{alert.customer_id}</span>
                      <span className="text-[10px] text-slate-500">{alert.sku_id}</span>
                      <span className="text-[10px] text-slate-500">{alert.timestamp}</span>
                    </div>
                    {alert.suggested_action && (
                      <div className="mt-1.5 text-[11px] px-2 py-1 rounded bg-white/5 text-cyan-300 inline-block">
                        {(t as Record<string, string>)['alerts_action'] || '建议'}: {alert.suggested_action}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{(t as Record<string, string>)['alerts_empty'] || '暂无预警'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
