import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslation } from '../hooks/useTranslation';

gsap.registerPlugin(ScrollTrigger);

export default function InsightsSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

  const challenges = [
    {
      num: '01',
      title: t.ch_title_1,
      desc: t.ch_desc_1,
      stat: t.ch_stat_1,
    },
    {
      num: '02',
      title: t.ch_title_2,
      desc: t.ch_desc_2,
      stat: t.ch_stat_2,
    },
    {
      num: '03',
      title: t.ch_title_3,
      desc: t.ch_desc_3,
      stat: t.ch_stat_3,
    },
    {
      num: '04',
      title: t.ch_title_4,
      desc: t.ch_desc_4,
      stat: t.ch_stat_4,
    },
    {
      num: '05',
      title: t.ch_title_5,
      desc: t.ch_desc_5,
      stat: t.ch_stat_5,
    },
  ];

  useEffect(() => {
    if (!sectionRef.current) return;
    const triggers: ScrollTrigger[] = [];

    const img1 = sectionRef.current.querySelector('.insight-img-1');
    const img2 = sectionRef.current.querySelector('.insight-img-2');
    const items = sectionRef.current.querySelectorAll('.insight-item');

    if (img1) {
      const a1 = gsap.fromTo(img1, { opacity: 0, x: -60 }, {
        opacity: 1, x: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: img1, start: 'top 80%', toggleActions: 'play none none none' },
      });
      if (a1.scrollTrigger) triggers.push(a1.scrollTrigger);
    }
    if (img2) {
      const a2 = gsap.fromTo(img2, { opacity: 0, x: -40, y: 40 }, {
        opacity: 1, x: 0, y: 0, duration: 1, delay: 0.2, ease: 'power3.out',
        scrollTrigger: { trigger: img2, start: 'top 80%', toggleActions: 'play none none none' },
      });
      if (a2.scrollTrigger) triggers.push(a2.scrollTrigger);
    }

    items.forEach((item, i) => {
      const a = gsap.fromTo(item, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.7, delay: i * 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: item, start: 'top 85%', toggleActions: 'play none none none' },
      });
      if (a.scrollTrigger) triggers.push(a.scrollTrigger);
    });

    return () => triggers.forEach((t) => t.kill());
  }, []);

  return (
    <section
      id="insights"
      ref={sectionRef}
      className="relative w-full py-32 md:py-40"
      style={{ backgroundColor: '#0A0C10', zIndex: 10 }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <span className="text-xs tracking-widest uppercase block mb-3" style={{ color: '#00D9C0', fontFamily: "'Space Grotesk', sans-serif" }}>
            {t.insights_section_label}
          </span>
          <h2
            className="text-3xl md:text-5xl font-bold"
            style={{ fontFamily: "'Space Grotesk', 'PingFang SC', sans-serif" }}
          >
            {t.insights_title}
          </h2>
          <p className="mt-4 text-base max-w-2xl mx-auto" style={{ color: '#AEB9D2' }}>
            {t.insights_subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left: Images */}
          <div className="relative h-96 lg:h-auto min-h-[500px]">
            <div
              className="insight-img-1 absolute top-0 left-0 w-4/5 h-80 rounded-sm overflow-hidden shadow-2xl"
              style={{ opacity: 0, zIndex: 2 }}
            >
              <img
                src="/images/warehouse-center.jpg"
                alt="Smart Warehouse Center"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,12,16,0.6), transparent)' }} />
            </div>
            <div
              className="insight-img-2 absolute bottom-0 right-0 w-3/5 h-64 rounded-sm overflow-hidden shadow-2xl"
              style={{
                opacity: 0,
                zIndex: 3,
                border: '1px solid rgba(0,217,192,0.2)',
              }}
            >
              <img
                src="/images/packaging-line.jpg"
                alt="Pharmaceutical Packaging Line"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,12,16,0.5), transparent)' }} />
            </div>
            {/* Decorative element */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full opacity-20"
              style={{
                background: 'radial-gradient(circle, #00D9C0 0%, transparent 70%)',
                filter: 'blur(40px)',
                zIndex: 1,
              }}
            />
          </div>

          {/* Right: Challenge list */}
          <div className="flex flex-col gap-0">
            {challenges.map((c) => (
              <div
                key={c.num}
                className="insight-item group py-6 border-b cursor-default transition-all duration-300"
                style={{
                  borderColor: 'rgba(255,255,255,0.05)',
                  opacity: 0,
                }}
              >
                <div className="flex items-start gap-5">
                  <span
                    className="text-xs font-medium mt-1 shrink-0"
                    style={{
                      color: '#00D9C0',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {c.num}
                  </span>
                  <div className="flex-1">
                    <h3
                      className="text-lg font-bold mb-2 group-hover:text-[#00D9C0] transition-colors duration-300"
                      style={{ fontFamily: "'Space Grotesk', 'PingFang SC', sans-serif" }}
                    >
                      {c.title}
                    </h3>
                    <p className="text-sm leading-relaxed mb-2" style={{ color: '#AEB9D2' }}>
                      {c.desc}
                    </p>
                    <span
                      className="inline-block text-xs px-3 py-1 rounded-sm"
                      style={{
                        backgroundColor: 'rgba(0,217,192,0.08)',
                        color: '#00D9C0',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {c.stat}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
