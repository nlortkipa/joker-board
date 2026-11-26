import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Player } from '../lib/model';
import { cx, MOD } from '../lib/util';
import { Close } from './Icons';

export const pcStyle = (p: Pick<Player, 'color'>): CSSProperties =>
  ({ '--pc': `var(--c${p.color ?? 0})`, '--pc-ink': p.color === 4 ? '#0b0b0b' : '#fff' }) as CSSProperties;

export function Avatar({ player, size, className, children }: { player: Player; size?: number; className?: string; children?: ReactNode }) {
  const style = { ...pcStyle(player), ...(size ? { '--size': `${size}px` } : {}) } as CSSProperties;
  return (
    <span className={cx('avatar', className)} style={style} title={player.name} aria-hidden>
      <span className="em">{player.emoji}</span>
      {children}
    </span>
  );
}

export function Kbd({ k }: { k: string }) {
  return (
    <span className="kbd" aria-hidden>
      {k.replace('Mod', MOD)}
    </span>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current?.querySelector<HTMLButtonElement>('button.on');
      if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [value, options.length]);
  return (
    <div className="segmented" ref={ref} role="radiogroup" aria-label={label}>
      {thumb && <span className="thumb" style={thumb} />}
      {options.map((o) => (
        <button
          key={String(o.id)}
          role="radio"
          aria-checked={o.id === value}
          className={cx(o.id === value && 'on')}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Modal that becomes a bottom sheet on phones. Closes on Esc / backdrop. */
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
  bare,
  top,
}: {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  bare?: boolean;
  top?: boolean;
}) {
  const [closing, setClosing] = useState(false);
  const close = useRef(() => {});
  close.current = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 170);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  return (
    <div
      className={cx('overlay', closing && 'closing', top && 'top')}
      onMouseDown={(e) => e.target === e.currentTarget && close.current()}
    >
      <div className={cx(bare ? 'palette' : 'modal', wide && 'wide')} role="dialog" aria-modal aria-label={typeof title === 'string' ? title : undefined}>
        {!bare && <div className="grabber" />}
        {title && (
          <div className="modal-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={() => close.current()} aria-label="დახურვა">
              <Close />
            </button>
          </div>
        )}
        {bare ? children : <div className="modal-body">{children}</div>}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ art, title, text, action }: { art: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="art">{art}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
