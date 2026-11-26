import { useMemo, useRef, useState } from 'react';
import type { Player } from '../lib/model';
import { raceSeries, type Result } from '../lib/stats';
import { cx, shortDate } from '../lib/util';
import { Avatar, pcStyle } from './ui';

const H = 220;
const PAD = { top: 12, right: 92, bottom: 26, left: 30 };

/** Cumulative wins per player across games — "the race". */
export function RaceChart({ players, res }: { players: Player[]; res: Result[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const ro = useRef<ResizeObserver | null>(null);
  const setRef = (el: HTMLDivElement | null) => {
    wrap.current = el;
    ro.current?.disconnect();
    if (el) {
      ro.current = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
      ro.current.observe(el);
    }
  };

  const points = useMemo(() => raceSeries(players, res), [players, res]);
  const n = points.length;
  const max = Math.max(1, ...players.map((p) => points[n - 1]?.counts[p.id] ?? 0));
  const step = max <= 5 ? 1 : max <= 12 ? 2 : max <= 30 ? 5 : max <= 60 ? 10 : 20;
  const yMax = Math.ceil(max / step) * step;
  const iw = Math.max(10, width - PAD.left - PAD.right);
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? iw : (i / (n - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / yMax) * ih;

  const series = players.map((p) => {
    const d = points.map((pt, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(pt.counts[p.id]).toFixed(1)}`).join('');
    // rough length for the draw-in animation
    const len = iw + ih * 2;
    return { p, d: `M${PAD.left},${y(0)}L${d.slice(1)}`, len, end: points[n - 1]?.counts[p.id] ?? 0 };
  });

  // End labels: nudge apart if they would collide, sorted by value.
  const labels = [...series].sort((a, b) => b.end - a.end);
  const placed: number[] = [];
  const labelY = new Map<string, number>();
  for (const s of labels) {
    let ly = y(s.end);
    for (const py of placed) if (Math.abs(py - ly) < 16) ly = py + 16;
    placed.push(ly);
    labelY.set(s.p.id, Math.min(ly, PAD.top + ih + 8));
  }

  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);

  const onMove = (clientX: number) => {
    const el = wrap.current;
    if (!el || n === 0) return;
    const rx = clientX - el.getBoundingClientRect().left;
    const i = Math.round(((rx - PAD.left) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const hp = hover !== null ? points[hover] : null;
  const pmap = new Map(players.map((p) => [p.id, p]));
  const tipLeft = hover !== null ? Math.min(Math.max(0, x(hover) + 12), width - 170) : 0;
  const tipFlip = hover !== null && x(hover) + 182 > width;

  return (
    <div>
      <div className="legend" role="list">
        {players.map((p) => (
          <span
            role="listitem"
            key={p.id}
            style={pcStyle(p)}
            onMouseEnter={() => setFocus(p.id)}
            onMouseLeave={() => setFocus(null)}
          >
            <i /> {p.name}
          </span>
        ))}
      </div>
      <div
        ref={setRef}
        className={cx('chart', focus && 'focus')}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
        role="img"
        aria-label={`მოგებების ჯამი ${n} თამაშში`}
      >
        <svg height={H} viewBox={`0 0 ${width} ${H}`}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={PAD.left + iw} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
              <text className="tick" x={PAD.left - 8} y={y(v) + 4} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {n > 1 && (
            <>
              <text className="tick" x={PAD.left} y={H - 6}>
                {shortDate(points[0].time)}
              </text>
              <text className="tick" x={PAD.left + iw} y={H - 6} textAnchor="end">
                {shortDate(points[n - 1].time)}
              </text>
            </>
          )}
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--axis)" strokeWidth={1} />
          )}
          {series.map((s) => (
            <path
              key={s.p.id}
              className={cx('line', 'draw', focus === s.p.id && 'hot')}
              d={s.d}
              style={{ ...pcStyle(s.p), ['--len' as string]: s.len * 2 }}
            />
          ))}
          {series.map((s) => (
            <g key={s.p.id} style={pcStyle(s.p)}>
              <circle
                cx={x(n - 1)}
                cy={y(s.end)}
                r={4}
                fill="var(--pc)"
                stroke="var(--bg-elev)"
                strokeWidth={2}
              />
              <text className="end-label" x={x(n - 1) + 10} y={(labelY.get(s.p.id) ?? 0) + 4}>
                {s.p.emoji} {s.end}
              </text>
            </g>
          ))}
          {hp &&
            series.map((s) => (
              <circle
                key={s.p.id}
                cx={x(hover!)}
                cy={y(hp.counts[s.p.id])}
                r={4.5}
                fill={`var(--c${s.p.color})`}
                stroke="var(--bg-elev)"
                strokeWidth={2}
              />
            ))}
        </svg>
        {hp && (
          <div className="tooltip" style={{ transform: `translateX(${tipFlip ? x(hover!) - 182 : tipLeft}px)` }}>
            <div className="t-head">
              #{hover! + 1} · {shortDate(hp.time)}
            </div>
            <div className="t-row muted" style={{ marginBottom: 4 }}>
              გაიმარჯვა:{' '}
              {hp.winners.map((w) => (
                <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {pmap.get(w) && <Avatar player={pmap.get(w)!} size={16} />} {pmap.get(w)?.name}
                </span>
              ))}
            </div>
            {[...players]
              .sort((a, b) => hp.counts[b.id] - hp.counts[a.id])
              .map((p) => (
                <div className="t-row" key={p.id} style={pcStyle(p)}>
                  <span className="dot" /> {p.name}
                  <b>{hp.counts[p.id]}</b>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
