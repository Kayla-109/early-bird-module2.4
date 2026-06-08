import { useEffect, useRef } from 'react';

const COLORS = ['#00D9C0', '#0055FF', '#FFFFFF'];

class Particle {
  x: number;
  y: number;
  r: number;
  dx: number;
  dy: number;
  color: string;
  baseR: number;

  constructor(w: number, h: number) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.baseR = Math.random() * 40 + 20;
    this.r = this.baseR;
    this.dx = (Math.random() - 0.5) * 0.3;
    this.dy = (Math.random() - 0.5) * 0.3;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  update(w: number, h: number) {
    this.x += this.dx;
    this.y += this.dy;

    if (this.x < 0) this.x = w;
    if (this.x > w) this.x = 0;
    if (this.y < 0) this.y = h;
    if (this.y > h) this.y = 0;

    this.r = this.baseR + Math.sin(Date.now() * 0.001 + this.x) * 5;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    gradient.addColorStop(0, this.color.replace(')', ', 0.8)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, this.color.replace(')', ', 0)').replace('rgb', 'rgba'));
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function FloatingAuraParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.parentElement?.clientWidth || window.innerWidth;
    let h = canvas.parentElement?.clientHeight || window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const particles: Particle[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push(new Particle(w, h));
    }

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.update(w, h);
        p.draw(ctx);
      });
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    const onResize = () => {
      w = canvas.parentElement?.clientWidth || window.innerWidth;
      h = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
