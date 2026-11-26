import { useToasts } from '../lib/toast';
import { cx } from '../lib/util';
import { Check, Close } from './Icons';

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cx('toast', t.kind, t.leaving && 'leaving')}>
          <span className="ti">{t.kind === 'error' ? <Close size={12} /> : t.kind === 'info' ? <span style={{ fontSize: 11 }}>✦</span> : <Check size={12} />}</span>
          {t.text}
        </div>
      ))}
    </div>
  );
}

const COLORS = ['#6d4aff', '#c04bff', '#ff6b8b', '#f2a600', '#00b894', '#257de0', '#ffd60a'];

/** Lightweight canvas confetti — no dependencies. */
export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = (canvas.width = innerWidth * dpr);
  const H = (canvas.height = innerHeight * dpr);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  const parts = Array.from({ length: 180 }, (_, i) => {
    const left = i % 2 === 0;
    return {
      x: left ? 0 : W,
      y: H * 0.7,
      vx: (left ? 1 : -1) * (6 + Math.random() * 12) * dpr,
      vy: -(14 + Math.random() * 16) * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: (6 + Math.random() * 6) * dpr,
      h: (8 + Math.random() * 8) * dpr,
      c: COLORS[i % COLORS.length],
      suit: Math.random() < 0.12 ? ['♠', '♥', '♦', '♣'][i % 4] : null,
    };
  });
  const start = performance.now();
  const frame = (t: number) => {
    const el = t - start;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.45 * dpr;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - el / 3200);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.suit) {
        ctx.font = `${18 * dpr}px system-ui`;
        ctx.fillText(p.suit, 0, 0);
      } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
      ctx.restore();
    }
    if (el < 3300) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
