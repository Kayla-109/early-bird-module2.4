import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router';

gsap.registerPlugin(ScrollTrigger);

export default function BentoGrid() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);

  const solutions = [
    {
      id: 'forecast',
      title: t.sol_forecast_title,
      desc: t.sol_forecast_desc,
      link: '/dashboard/forecast',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D9C0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 6-10" />
        </svg>
      ),
      span: 'lg:col-span-2 lg:row-span-2',
      bg: 'linear-gradient(135deg, rgba(0,85,255,0.1), rgba(0,217,192,0.05))',
      metrics: [t.sol_forecast_tag1, t.sol_forecast_tag2, t.sol_forecast_tag3],
    },
    {
      id: 'restock',
      title: t.sol_restock_title,
      desc: t.sol_restock_desc,
      link: '/dashboard/replenishment',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D9C0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
      span: '',
      bg: '',
      metrics: [t.sol_restock_tag1, t.sol_restock_tag2, t.sol_restock_tag3],
    },
    {
      id: 'inventory',
      title: t.sol_inventory_title,
      desc: t.sol_inventory_desc,
      link: '/dashboard/inventory',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0055FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
      span: '',
      bg: '',
      metrics: [t.sol_inventory_tag1, t.sol_inventory_tag2, t.sol_inventory_tag3],
    },
    {
      id: 'policy',
      title: t.sol_policy_title,
      desc: t.sol_policy_desc,
      link: '/dashboard/policy',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D9C0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
      span: '',
      bg: '',
      metrics: [t.sol_policy_tag1, t.sol_policy_tag2, t.sol_policy_tag3],
    },
    {
      id: 'alert',
      title: t.sol_alert_title,
      desc: t.sol_alert_desc,
      link: '/dashboard/alerts',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0055FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      ),
      span: '',
      bg: '',
      metrics: [t.sol_alert_tag1, t.sol_alert_tag2, t.sol_alert_tag3],
    },
  ];

  useEffect(() => {
    if (!sectionRef.current) return;
    const cards = sectionRef.current.querySelectorAll('.bento-card');
    const triggers: ScrollTrigger[] = [];

    cards.forEach((card, i) => {
      const anim = gsap.fromTo(
        card,
        { opacity: 0, y: 50, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          delay: i * 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
      if (anim.scrollTrigger) triggers.push(anim.scrollTrigger);
    });

    return () => triggers.forEach((t) => t.kill());
  }, []);

  return (
    <section
      id="solutions"
      ref={sectionRef}
      className="relative w-full py-32 md:py-40"
      style={{ backgroundColor: '#0A0C10', zIndex: 10 }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs tracking-widest uppercase block mb-3" style={{ color: '#00D9C0', fontFamily: "'Space Grotesk', sans-serif" }}>
            {t.solutions_section_label}
          </span>
          <h2
            className="text-3xl md:text-5xl font-bold"
            style={{ fontFamily: "'Space Grotesk', 'PingFang SC', sans-serif" }}
          >
            {t.solutions_title}
          </h2>
          <p className="mt-4 text-base max-w-2xl mx-auto" style={{ color: '#AEB9D2' }}>
            {t.solutions_subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {solutions.map((solution) => (
            <div
              key={solution.id}
              onClick={() => navigate(solution.link || '/dashboard')}
              className={`bento-card group relative p-8 rounded-sm transition-all duration-500 hover:glow-cyan cursor-pointer ${solution.span}`}
              style={{
                backgroundColor: '#0F111A',
                background: solution.bg || '#0F111A',
                border: '1px solid rgba(255,255,255,0.05)',
                opacity: 0,
              }}
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="w-12 h-12 rounded-sm flex items-center justify-center" style={{ backgroundColor: 'rgba(0,217,192,0.08)' }}>
                  {solution.icon}
                </div>
                <svg
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1"
                  viewBox="0 0 24 24" fill="none" stroke="#00D9C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>

              <h3
                className="text-xl font-bold mb-3 group-hover:text-[#00D9C0] transition-colors duration-300"
                style={{ fontFamily: "'Space Grotesk', 'PingFang SC', sans-serif" }}
              >
                {solution.title}
              </h3>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: '#AEB9D2' }}>
                {solution.desc}
              </p>

              <div className="flex flex-wrap gap-2">
                {solution.metrics.map((m) => (
                  <span
                    key={m}
                    className="text-xs px-3 py-1 rounded-sm"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      color: '#AEB9D2',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
