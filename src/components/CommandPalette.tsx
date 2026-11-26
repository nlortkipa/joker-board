import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fmtScore, placesOf, type Game, type Player } from '../lib/model';
import { getPrefs, setPrefs } from '../lib/prefs';
import { go } from '../lib/router';
import { playerMap, UNKNOWN } from '../lib/store';
import { cx, dayLabel } from '../lib/util';
import { Cards, Gear, People, Plus, Search, Trophy } from './Icons';
import { Avatar, Kbd, Modal } from './ui';

interface Item {
  id: string;
  group: string;
  label: string;
  icon: ReactNode;
  hint?: ReactNode;
  run: () => void;
}

export function CommandPalette({
  players,
  games,
  onClose,
  actions,
}: {
  players: Player[];
  games: Game[];
  onClose: () => void;
  actions: { log: () => void; newPlayer: () => void; settings: () => void; shortcuts: () => void };
}) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const pm = useMemo(() => playerMap(players), [players]);

  const items = useMemo<Item[]>(() => {
    const base: Item[] = [
      { id: 'log', group: 'მოქმედებები', label: 'თამაშის ჩაწერა', icon: <Plus />, hint: <Kbd k="N" />, run: actions.log },
      { id: 'newp', group: 'მოქმედებები', label: 'მოთამაშის დამატება', icon: <People />, hint: <Kbd k="P" />, run: actions.newPlayer },
      { id: 'lb', group: 'გადასვლა', label: 'რეიტინგი', icon: <Trophy />, hint: <Kbd k="1" />, run: () => go('/leaderboard') },
      { id: 'gm', group: 'გადასვლა', label: 'თამაშები', icon: <Cards />, hint: <Kbd k="2" />, run: () => go('/games') },
      { id: 'pl', group: 'გადასვლა', label: 'მოთამაშეები', icon: <People />, hint: <Kbd k="3" />, run: () => go('/players') },
      { id: 'st', group: 'მოქმედებები', label: 'პარამეტრები', icon: <Gear />, hint: <Kbd k="S" />, run: actions.settings },
      {
        id: 'th',
        group: 'მოქმედებები',
        label: 'მუქი / ნათელი რეჟიმი',
        icon: <span style={{ fontSize: 14 }}>🌗</span>,
        run: () => {
          const dark =
            document.documentElement.getAttribute('data-theme') === 'dark' ||
            (getPrefs().theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
          setPrefs({ theme: dark ? 'light' : 'dark' });
        },
      },
      { id: 'kb', group: 'მოქმედებები', label: 'კლავიატურის მალსახმობები', icon: <span style={{ fontSize: 13 }}>⌨️</span>, hint: <Kbd k="?" />, run: actions.shortcuts },
    ];
    const s = q.trim().toLowerCase();
    if (!s) return base;
    const people: Item[] = players
      .filter((p) => p.name.toLowerCase().includes(s))
      .map((p) => ({ id: `p-${p.id}`, group: 'მოთამაშეები', label: p.name, icon: <Avatar player={p} />, run: () => go('/players') }));
    const found: Item[] = [...games]
      .filter((g) => g.playerIds.some((id) => pm.get(id)?.name.toLowerCase().includes(s)))
      .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
      .slice(0, 6)
      .map((g) => {
        const places = placesOf(g.scores);
        const w = places.indexOf(1);
        const winner = pm.get(g.playerIds[w]) ?? UNKNOWN;
        return {
          id: `g-${g.id}`,
          group: 'თამაშები',
          label: `🏆 ${winner.emoji} ${winner.name} · ${fmtScore(g.scores[w])}`,
          icon: <Cards />,
          hint: <span>{dayLabel(new Date(g.playedAt).getTime())}</span>,
          run: () => go(`/games/${g.id}`),
        };
      });
    return [...base.filter((i) => i.label.toLowerCase().includes(s)), ...people, ...found];
  }, [q, games, players, pm, actions]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    list.current?.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const run = (i: Item | undefined) => {
    if (!i) return;
    onClose();
    i.run();
  };

  let lastGroup = '';
  return (
    <Modal bare top onClose={onClose}>
      <div className="palette-input">
        <Search size={18} />
        <input
          autoFocus
          placeholder="მოძებნე მოთამაშე, თამაში ან მოქმედება…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel((s) => Math.min(items.length - 1, s + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              run(items[sel]);
            }
          }}
        />
        <Kbd k="Esc" />
      </div>
      <div className="palette-list" ref={list}>
        {items.length === 0 && <div className="palette-empty">„{q}“ — ვერაფერი მოიძებნა</div>}
        {items.map((it, i) => {
          const head = it.group !== lastGroup ? it.group : null;
          lastGroup = it.group;
          return (
            <div key={it.id}>
              {head && <div className="palette-group">{head}</div>}
              <button className={cx('palette-item', i === sel && 'sel')} onMouseMove={() => setSel(i)} onClick={() => run(it)}>
                {it.icon}
                {it.label}
                {it.hint && <span className="muted">{it.hint}</span>}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
