import { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  BarChart3,
  Truck,
  PackageSearch,
  Landmark,
  Bell,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  Menu,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { generateAlerts, getUnreadCount } from '../lib/alertEngine';
import { dataEngine } from '../lib/dataEngine';

const navItems = [
  { path: '/dashboard', labelKey: 'dash_overview', icon: LayoutDashboard },
  { path: '/dashboard/forecast', labelKey: 'dash_forecast', icon: BarChart3 },
  { path: '/dashboard/replenishment', labelKey: 'dash_replenishment', icon: Truck },
  { path: '/dashboard/inventory', labelKey: 'dash_inventory', icon: PackageSearch },
  { path: '/dashboard/policy', labelKey: 'dash_policy', icon: Landmark },
  { path: '/dashboard/alerts', labelKey: 'dash_alerts', icon: Bell },
];

export default function DashboardLayout() {
  const { t, lang, toggleLang } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    dataEngine.init().then(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      generateAlerts().then(alerts => {
        setUnreadCount(getUnreadCount(alerts));
      });
    }
  }, [location.pathname, loading]);

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: '#0A0C10', color: '#E2E8F0' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r transition-all duration-300 fixed lg:relative z-50 h-full ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          width: collapsed ? 72 : 240,
          borderColor: 'rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(10,12,16,0.95)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => { navigate('/'); setMobileOpen(false); }}
            className="flex items-center gap-3 w-full text-left"
          >
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #0055FF, #00D9C0)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold tracking-wide whitespace-nowrap" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                PHARMALINK <span style={{ color: '#00D9C0' }}>AI</span>
              </span>
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isAlerts = item.path === '/dashboard/alerts';
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'linear-gradient(135deg, rgba(0,85,255,0.15), rgba(0,217,192,0.1))' : undefined,
                  border: isActive ? '1px solid rgba(0,217,192,0.2)' : '1px solid transparent',
                })}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <span className="flex-1 whitespace-nowrap">
                    {(t as Record<string, string>)[item.labelKey] || item.labelKey}
                  </span>
                )}
                {isAlerts && unreadCount > 0 && !collapsed && (
                  <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                    {unreadCount}
                  </Badge>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-2 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="h-16 flex items-center justify-between px-6 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(10,12,16,0.8)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <h1 className="text-sm font-semibold tracking-wide text-slate-200">
              {(t as Record<string, string>)['dash_title'] || '医药需求预测与智能补货系统'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 text-xs tracking-wider uppercase px-3 py-1.5 rounded-sm transition-all hover:bg-white/10"
              style={{ color: '#AEB9D2', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Globe size={14} />
              <span>{lang === 'zh' ? 'EN' : '中文'}</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50" style={{ backgroundColor: 'rgba(10,12,16,0.9)', backdropFilter: 'blur(4px)' }}>
              <Loader2 size={32} className="animate-spin text-cyan-400 mb-4" />
              <p className="text-sm text-slate-400">{(t as Record<string, string>)['dash_loading'] || '加载中...'}</p>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
