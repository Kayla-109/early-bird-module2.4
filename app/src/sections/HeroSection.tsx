import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useTranslation } from '../hooks/useTranslation';

export default function HeroSection() {
  const { t } = useTranslation();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.3 });
    if (titleRef.current) {
      tl.fromTo(titleRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' });
    }
    if (subtitleRef.current) {
      tl.fromTo(subtitleRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=0.7');
    }
    if (btnRef.current) {
      tl.fromTo(btnRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5');
    }
    if (statsRef.current) {
      tl.fromTo(statsRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8 }, '-=0.3');
    }
    return () => { tl.kill(); };
  }, []);

  const handleExplore = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.querySelector('#metrics');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      className="relative w-full flex flex-col items-center justify-center text-center px-6"
      style={{ height: '100vh', zIndex: 1 }}
    >
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#00D9C0' }} />
          <span className="text-xs tracking-widest uppercase" style={{ color: '#AEB9D2', fontFamily: "'Space Grotesk', sans-serif" }}>
            {t.nav_platform}
          </span>
        </div>

        <h1
          ref={titleRef}
          className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          style={{
            fontFamily: "'Space Grotesk', 'PingFang SC', sans-serif",
            opacity: 0,
          }}
        >
          {t.hero_title_line1}
          <br />
          <span className="text-gradient">{t.hero_title_line2}</span>
        </h1>

        <p
          ref={subtitleRef}
          className="text-base md:text-lg max-w-2xl mx-auto mb-10"
          style={{
            color: '#AEB9D2',
            fontFamily: "'Inter', 'PingFang SC', sans-serif",
            lineHeight: 1.7,
            opacity: 0,
          }}
        >
          {t.hero_subtitle}
        </p>

        <a
          ref={btnRef}
          href="#metrics"
          onClick={handleExplore}
          className="inline-flex items-center gap-3 text-sm font-medium px-8 py-4 rounded-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #0055FF, #00D9C0)',
            color: '#FFFFFF',
            fontFamily: "'Space Grotesk', sans-serif",
            opacity: 0,
          }}
        >
          {t.hero_cta}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>

        <div
          ref={statsRef}
          className="mt-20 grid grid-cols-3 gap-8 md:gap-16 max-w-lg mx-auto"
          style={{ opacity: 0 }}
        >
          {[
            { value: '380,000+', label: t.hero_sku },
            { value: '198.47亿', label: t.hero_revenue },
            { value: '99.3%', label: t.hero_accuracy },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-lg md:text-2xl font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#00D9C0' }}
              >
                {stat.value}
              </div>
              <div className="text-xs mt-1" style={{ color: '#AEB9D2' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ zIndex: 10 }}>
        <span className="text-xs tracking-wider" style={{ color: '#AEB9D2' }}>{t.hero_scroll}</span>
        <div className="w-px h-8 relative overflow-hidden" style={{ backgroundColor: 'rgba(174,185,210,0.2)' }}>
          <div
            className="w-full h-3 absolute top-0"
            style={{
              background: 'linear-gradient(to bottom, #00D9C0, transparent)',
              animation: 'scrollPulse 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes scrollPulse {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
      `}</style>
    </section>
  );
}
