import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslation } from '../hooks/useTranslation';

gsap.registerPlugin(ScrollTrigger);

export default function CinematicDepthText() {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const textElements = wrapRef.current.querySelectorAll<HTMLElement>('.depth-text');

    const triggers: ScrollTrigger[] = [];

    textElements.forEach((textElement) => {
      const anim = gsap.fromTo(
        textElement,
        { letterSpacing: '-1px' },
        {
          letterSpacing: '20px',
          scrollTrigger: {
            trigger: textElement,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            onUpdate: (self) => {
              textElement.style.setProperty('--progress', String(self.progress));
            },
          },
        }
      );
      if (anim.scrollTrigger) triggers.push(anim.scrollTrigger);
    });

    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden"
      style={{ background: '#0A0C10' }}
    >
      <div
        className="content-bg absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'url(/images/depth-ampoule.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div
        className="content-wrap relative z-10 flex flex-col items-center justify-center py-40 md:py-60"
      >
        <h2
          className="depth-text text-center font-bold uppercase select-none"
          style={{
            lineHeight: 0.8,
            textTransform: 'uppercase',
            fontWeight: 700,
            fontSize: 'clamp(3rem, 18vw, 12rem)',
            fontFamily: "'Space Grotesk', sans-serif",
            backgroundImage: 'url(/images/depth-ampoule.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {t.depth_line1}
          <br />
          {t.depth_line2}
        </h2>
        <p
          className="mt-12 text-center text-lg md:text-xl max-w-2xl px-6"
          style={{ color: '#AEB9D2', fontFamily: "'Inter', 'PingFang SC', sans-serif" }}
        >
          {t.depth_subtitle}
        </p>
      </div>
    </div>
  );
}
