import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
export default function Navbar() {
  const { t, lang, toggleLang } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.5);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const navItems = [
    { label: t.nav_capabilities, href: '#metrics' },
    { label: t.nav_solutions, href: '#solutions' },
    { label: t.nav_insights, href: '#insights' },
    { label: t.nav_contact, href: '#footer' },
  ];

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 transition-all duration-500"
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: scrolled ? 'rgba(10, 12, 16, 0.85)' : 'rgba(10, 12, 16, 0.3)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0055FF, #00D9C0)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            PHARMALINK <span className="text-xs font-normal" style={{ color: '#00D9C0' }}>AI</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleClick(e, item.href)}
              className="text-xs tracking-widest uppercase transition-colors duration-300 hover:text-white"
              style={{ color: '#AEB9D2', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {item.label}
            </a>
          ))}

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-xs tracking-wider uppercase px-3 py-1.5 rounded-sm transition-all duration-300 hover:bg-white/10"
            style={{
              color: '#AEB9D2',
              border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
            title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>{lang === 'zh' ? 'EN' : '中文'}</span>
          </button>

          <a
            href="#/dashboard"
            className="text-xs font-medium px-5 py-2 rounded-sm transition-all duration-300 hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #0055FF, #00D9C0)',
              color: '#FFFFFF',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {t.nav_try}
          </a>
        </div>

        {/* Mobile: lang toggle only */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 text-xs tracking-wider uppercase px-2.5 py-1.5 rounded-sm"
            style={{
              color: '#AEB9D2',
              border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>{lang === 'zh' ? 'EN' : '中文'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
