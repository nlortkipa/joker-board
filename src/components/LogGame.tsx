import { useRef, useState, type DragEvent } from 'react';
import { fmtScore, parseScore, placesOf, SEATS, type Game, type Player } from '../lib/model';
import { go } from '../lib/router';
import { saveGame, savePlayer, uid } from '../lib/store';
import { toast } from '../lib/toast';
import { cx, toLocalInput } from '../lib/util';
import { confetti } from './Feedback';
import { Close } from './Icons';
import { newPlayer } from './Players';
import { Avatar, Kbd, Modal, pcStyle } from './ui';

const MEDALS = ['🥇', '🥈', '🥉', '4'];

/** Log a finished game: who played and their final scores. */
export function LogGame({
  players,
  games,
  edit,
  seed,
  onClose,
}: {
  players: Player[];
  games: Game[];
  edit?: Game;
  seed?: string[];
  onClose: () => void;
}) {
  const ids = new Set(players.map((p) => p.id));
  const last = [...games].sort((a, b) => b.playedAt.localeCompare(a.playedAt))[0];
  const initialIds = edit
    ? edit.playerIds
    : seed ?? (last && last.playerIds.every((id) => ids.has(id)) ? last.playerIds : players.slice(0, SEATS).map((p) => p.id));

  const [slots, setSlots] = useState<(string | null)[]>(() =>
    Array.from({ length: SEATS }, (_, i) => initialIds[i] ?? null),
  );
  const [scores, setScores] = useState<string[]>(() =>
    Array.from({ length: SEATS }, (_, i) => (edit ? String(edit.scores[i] ?? '') : '')),
  );
  const [when, setWhen] = useState(() => toLocalInput(edit ? new Date(edit.playedAt) : new Date()));
  const [name, setName] = useState('');
  const [over, setOver] = useState<number | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const pm = new Map(players.map((p) => [p.id, p]));
  const parsed = scores.map(parseScore);
  const full = slots.every(Boolean);
  const valid = full && parsed.every((v) => v !== null) && !Number.isNaN(new Date(when).getTime());
  const places = parsed.every((v) => v !== null) ? placesOf(parsed as number[]) : null;

  const focusSlot = (i: number) => setTimeout(() => inputs.current[i]?.focus(), 30);

  const place = (id: string, slot: number) => {
    setSlots((s) => {
      const next = [...s];
      const from = next.indexOf(id);
      if (from !== -1) next[from] = next[slot];
      next[slot] = id;
      return next;
    });
    focusSlot(slot);
  };

  const toggle = (id: string) => {
    const at = slots.indexOf(id);
    if (at !== -1) {
      setSlots((s) => s.map((x) => (x === id ? null : x)));
      return;
    }
    const free = slots.indexOf(null);
    if (free === -1) return toast('მაგიდასთან 4 ადგილია — ჯერ ვინმე მოხსენი', 'info');
    place(id, free);
  };

  const addPlayer = () => {
    const n = name.trim();
    if (!n) return;
    if (players.some((p) => p.name.toLowerCase() === n.toLowerCase())) return toast(`${n} უკვე სიაშია`, 'error');
    const p = newPlayer(n, players);
    savePlayer(p);
    setName('');
    const free = slots.indexOf(null);
    if (free !== -1) place(p.id, free);
  };

  const save = () => {
    if (!valid) return;
    const game: Game = {
      id: edit?.id ?? uid(),
      createdAt: edit?.createdAt ?? new Date().toISOString(),
      playedAt: new Date(when).toISOString(),
      playerIds: slots as string[],
      scores: parsed as number[],
    };
    saveGame(game);
    onClose();
    if (edit) return toast('ცვლილებები შენახულია');
    const winners = game.playerIds.filter((_, i) => places![i] === 1).map((id) => pm.get(id)?.name);
    toast(`🏆 გამარჯვებული: ${winners.join(', ')}`, 'info');
    confetti();
    go(`/games/${game.id}`);
  };

  const onDrop = (e: DragEvent, slot: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/x-joker-player');
    if (id && pm.has(id)) place(id, slot);
    setOver(null);
  };

  return (
    <Modal
      title={edit ? 'თამაშის რედაქტირება' : 'თამაშის ჩაწერა'}
      wide
      onClose={onClose}
      footer={
        <>
          <span className="faint left hide-mobile" style={{ fontSize: 12 }}>
            {!full ? 'აირჩიე 4 მოთამაშე' : !valid ? 'ჩაწერე ყველას ქულა' : 'ყველაფერი მზადაა ✨'}
          </span>
          <button className="btn" onClick={onClose}>
            გაუქმება
          </button>
          <button className="btn primary" disabled={!valid} onClick={save}>
            შენახვა <Kbd k="↵" />
          </button>
        </>
      }
    >
      <div className="field">
        <span>ვინ თამაშობდა?</span>
        <div className="roster">
          {players.map((p) => (
            <button
              key={p.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/x-joker-player', p.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              className={cx('roster-chip', slots.includes(p.id) && 'seated')}
              style={pcStyle(p)}
              onClick={() => toggle(p.id)}
              aria-pressed={slots.includes(p.id)}
            >
              <Avatar player={p} /> {p.name}
            </button>
          ))}
        </div>
        <div className="add-inline">
          <input
            className="input"
            placeholder={players.length ? 'ახალი მოთამაშე…' : 'დაამატე პირველი მოთამაშე…'}
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPlayer();
              }
            }}
            autoFocus={players.length < SEATS}
          />
          <button className="btn" onClick={addPlayer} disabled={!name.trim()}>
            დამატება
          </button>
        </div>
      </div>

      <div className="field">
        <span>ქულები</span>
        <div className="score-slots">
          {slots.map((id, i) => {
            const p = id ? pm.get(id) : undefined;
            const pl = places && p ? places[i] : null;
            return (
              <div
                key={i}
                className={cx('score-slot', !p && 'empty', over === i && 'over', pl === 1 && 'leading')}
                style={p ? pcStyle(p) : undefined}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(i);
                }}
                onDragLeave={() => setOver((o) => (o === i ? null : o))}
                onDrop={(e) => onDrop(e, i)}
              >
                {p ? (
                  <>
                    <Avatar player={p} />
                    <b className="slot-name">{p.name}</b>
                    <span className="slot-medal" key={pl ?? 'x'}>
                      {pl ? MEDALS[pl - 1] : ''}
                    </span>
                    <input
                      ref={(el) => {
                        inputs.current[i] = el;
                      }}
                      className={cx('input score-input num', scores[i] && parsed[i] === null && 'invalid')}
                      inputMode="decimal"
                      enterKeyHint={i === SEATS - 1 ? 'done' : 'next'}
                      placeholder="0"
                      aria-label={`${p.name} — ქულა`}
                      value={scores[i]}
                      onChange={(e) => setScores((s) => s.map((v, k) => (k === i ? e.target.value : v)))}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        const nextEmpty = scores.findIndex((v, k) => k !== i && parseScore(v) === null);
                        if (valid) save();
                        else if (nextEmpty !== -1) inputs.current[nextEmpty]?.focus();
                      }}
                      onBlur={() => parsed[i] !== null && setScores((s) => s.map((v, k) => (k === i ? String(parsed[i]) : v)))}
                    />
                    <button className="icon-btn" onClick={() => toggle(p.id)} aria-label={`${p.name}-ის მოხსნა`}>
                      <Close size={14} />
                    </button>
                  </>
                ) : (
                  <span className="slot-ph">
                    <span className="ph-dot">{i + 1}</span> აირჩიე ან ჩამოათრიე მოთამაშე
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <label className="field">
        <span>როდის ითამაშეთ?</span>
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>

      {places && full && (
        <div className="log-preview">
          🏆{' '}
          {slots
            .map((id, i) => ({ id, i }))
            .filter(({ i }) => places[i] === 1)
            .map(({ id }) => pm.get(id!)?.name)
            .join(', ')}{' '}
          იგებს · {fmtScore(Math.max(...(parsed as number[])))} ქულა
        </div>
      )}
    </Modal>
  );
}
