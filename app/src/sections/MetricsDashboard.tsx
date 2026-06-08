import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslation } from '../hooks/useTranslation';
import FloatingAuraParticles from './FloatingAuraParticles';

gsap.registerPlugin(ScrollTrigger);

function AnimatedCounter({ target, suffix = '', duration = 2 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / (duration * 1000), 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  const formatNumber = (n: number) => {
    if (n >= 10000) return (n / 10000).toFixed(0) + '万';
    if (n >= 1000) return (n / 10000).toFixed(1) + '万';
    return n.toLocaleString();
  };

  return (
    <div ref={ref} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {formatNumber(count)}{suffix}
    </div>
  );
}

function CircularProgress({ target, label, color }: { target: number; label: string; color: string }) {
  const ref = useRef<SVGCircleElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          const circle = ref.current;
          if (circle) {
            gsap.fromTo(
              circle,
              { strokeDashoffset: 339.292 },
              { strokeDashoffset: 339.292 * (1 - target / 100), duration: 2, ease: 'power3.out' }
            );
          }
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            ref={ref}
            cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="339.292"
            strokeDashoffset="339.292"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color }}>
            T+{Math.round(target / 33)}
          </span>
        </div>
      </div>
      <span className="text-xs mt-3" style={{ color: '#AEB9D2' }}>{label}</span>
    </div>
  );
}

export default function MetricsDashboard() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const cards = sectionRef.current.querySelectorAll('.metric-card');
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
        end: 'top 30%',
        scrub: false,
        toggleActions: 'play none none none',
      },
    });
    tl.fromTo(
      cards,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out' }
    );
    return () => { tl.kill(); };
  }, []);

  return (
    <section
      id="metrics"
      ref={sectionRef}
      className="relative w-full py-32 md:py-40"
      style={{ backgroundColor: '#0A0C10', zIndex: 10 }}
    >
      <FloatingAuraParticles />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs tracking-widest uppercase block mb-3" style={{ color: '#00D9C0', fontFamily: "'Space Grotesk', sans-serif" }}>
            {t.metrics_section_label}
          </span>
          <h2
            className="text-3xl md:text-5xl font-bold"
            style={{ fontFamily: "'Space Grotesk', 'PingFang SC', sans-serif" }}
          >
            {t.metrics_title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Panel 1: SKU */}
          <div
            className="metric-card p-8 rounded-sm transition-all duration-300 hover:glow-cyan"
            style={{ backgroundColor: '#0F111A', border: '1px solid rgba(255,255,255,0.05)', opacity: 0 }}
          >
            <div className="text-xs tracking-wider uppercase mb-4" style={{ color: '#AEB9D2' }}>
              {t.metrics_sku_title}
            </div>
            <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: '#FFFFFF', fontFamily: "'Space Grotesk', sans-serif" }}>
              <AnimatedCounter target={380000} />
            </div>
            <div className="text-xs" style={{ color: '#AEB9D2' }}>{t.metrics_sku_desc}</div>
            <div className="mt-6 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full" style={{ width: '78%', background: 'linear-gradient(90deg, #0055FF, #00D9C0)' }} />
            </div>
          </div>

          {/* Panel 2: Accuracy */}
          <div
            className="metric-card p-8 rounded-sm transition-all duration-300 hover:glow-cyan"
            style={{ backgroundColor: '#0F111A', border: '1px solid rgba(255,255,255,0.05)', opacity: 0 }}
          >
            <div className="text-xs tracking-wider uppercase mb-4" style={{ color: '#AEB9D2' }}>
              {t.metrics_acc_title}
            </div>
            <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: '#00D9C0', fontFamily: "'Space Grotesk', sans-serif" }}>
              <AnimatedCounter target={99} suffix=".3%" />
            </div>
            <div className="text-xs" style={{ color: '#AEB9D2' }}>{t.metrics_acc_desc}</div>
            <div className="mt-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00D9C0' }} />
              <span className="text-xs" style={{ color: '#00D9C0' }}>{t.metrics_acc_status}</span>
            </div>
          </div>

          {/* Panel 3: Turnover */}
          <div
            className="metric-card p-8 rounded-sm transition-all duration-300 hover:glow-cyan"
            style={{ backgroundColor: '#0F111A', border: '1px solid rgba(255,255,255,0.05)', opacity: 0 }}
          >
            <div className="text-xs tracking-wider uppercase mb-4" style={{ color: '#AEB9D2' }}>
              {t.metrics_turn_title}
            </div>
            <CircularProgress target={65} label={t.metrics_turn_desc} color="#0055FF" />
            <div className="mt-4 text-xs" style={{ color: '#AEB9D2' }}>
              {t.metrics_turn_detail}
            </div>
          </div>

          {/* Panel 4: Coverage */}
          <div
            className="metric-card p-8 rounded-sm transition-all duration-300 hover:glow-cyan"
            style={{ backgroundColor: '#0F111A', border: '1px solid rgba(255,255,255,0.05)', opacity: 0 }}
          >
            <div className="text-xs tracking-wider uppercase mb-4" style={{ color: '#AEB9D2' }}>
              {t.metrics_term_title}
            </div>
            <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: '#FFFFFF', fontFamily: "'Space Grotesk', sans-serif" }}>
              <AnimatedCounter target={286000} />
            </div>
            <div className="text-xs" style={{ color: '#AEB9D2' }}>{t.metrics_term_desc}</div>
            <div className="mt-6 grid grid-cols-5 gap-1">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full"
                  style={{
                    backgroundColor: i < 11 ? '#00D9C0' : 'rgba(255,255,255,0.1)',
                    opacity: i < 11 ? 0.5 + (i % 3) * 0.25 : 1,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
