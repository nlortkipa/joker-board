import { useMemo, useState } from 'react';
import { fmtScore, type Game, type Player } from '../lib/model';
import { pct, playerStats, results } from '../lib/stats';
import { deletePlayer, savePlayer, uid } from '../lib/store';
import { toast } from '../lib/toast';
import { COLOR_NAMES, cx, EMOJIS } from '../lib/util';
import { Pencil, Plus, Trash } from './Icons';
import { Avatar, Empty, Kbd, Modal, pcStyle } from './ui';

export function newPlayer(name: string, taken: Player[]): Player {
  const usedColors = new Set(taken.map((p) => p.color));
  const usedEmoji = new Set(taken.map((p) => p.emoji));
  const color = [1, 2, 3, 4, 5, 6, 7, 8].find((c) => !usedColors.has(c)) ?? (taken.length % 8) + 1;
  const free = EMOJIS.filter((e) => !usedEmoji.has(e));
  const emoji = free[Math.floor(Math.random() * free.length)] ?? '🃏';
  return { id: uid(), name: name.trim(), emoji, color, createdAt: new Date().toISOString() };
}

export function Players({ players, games, onAdd }: { players: Player[]; games: Game[]; onAdd: () => void }) {
  const stats = useMemo(() => playerStats(players, results(games)), [players, games]);
  const [editing, setEditing] = useState<Player | null>(null);
  const byId = new Map(stats.map((s) => [s.player.id, s]));
  const sorted = [...players].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (!players.length)
    return (
      <Empty
        art="👨‍👩‍👧‍👦"
        title="ვინ სხედან მაგიდასთან?"
        text="დაამატე ყველა, ვინც თამაშობს. აურჩიე ემოჯი და ფერი, რომ ადვილად გამოირჩეოდნენ."
        action={
          <button className="btn primary large" onClick={onAdd}>
            <Plus /> მოთამაშის დამატება <Kbd k="P" />
          </button>
        }
      />
    );

  return (
    <>
      <div className="player-grid">
        {sorted.map((p, i) => {
          const s = byId.get(p.id);
          return (
            <div key={p.id} className="card player-card" style={{ ...pcStyle(p), animationDelay: `${i * 40}ms` }}>
              <button className="icon-btn edit" onClick={() => setEditing(p)} aria-label={`${p.name} — რედაქტირება`}>
                <Pencil />
              </button>
              <Avatar player={p} />
              <div className="pname">{p.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {s?.streak && s.streak >= 2 ? `🔥 ${s.streak} მოგება ზედიზედ` : s?.games ? `რეკორდი ${fmtScore(s.best)}` : 'ჯერ არ უთამაშია'}
              </div>
              <div className="pstats">
                <div>
                  <b>{s?.wins ?? 0}</b>
                  <span>მოგება</span>
                </div>
                <div>
                  <b>{s?.games ?? 0}</b>
                  <span>თამაში</span>
                </div>
                <div>
                  <b>{s?.games ? pct(s.winRate) : '–'}</b>
                  <span>მოგ. %</span>
                </div>
              </div>
            </div>
          );
        })}
        <button className="card player-card add" onClick={onAdd}>
          <Plus size={28} />
          <span style={{ fontWeight: 600 }}>მოთამაშის დამატება</span>
        </button>
      </div>
      {editing && (
        <PlayerEditor
          player={editing}
          players={players}
          inGames={games.some((g) => g.playerIds.includes(editing.id))}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

export function PlayerEditor({
  player,
  players,
  inGames = false,
  onClose,
  isNew,
}: {
  player: Player;
  players: Player[];
  inGames?: boolean;
  onClose: () => void;
  isNew?: boolean;
}) {
  const [draft, setDraft] = useState(player);
  const [confirm, setConfirm] = useState(false);
  const name = draft.name.trim();
  const dupe = players.some((p) => p.id !== draft.id && p.name.toLowerCase() === name.toLowerCase());
  const valid = name.length > 0 && name.length <= 24 && !dupe;

  const save = () => {
    if (!valid) return;
    savePlayer({ ...draft, name });
    toast(isNew ? `${draft.emoji} ${name} შემოგვიერთდა` : 'შენახულია');
    onClose();
  };

  return (
    <Modal
      title={isNew ? 'ახალი მოთამაშე' : 'მოთამაშის რედაქტირება'}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <div className="left">
              {inGames ? (
                <span className="faint" style={{ fontSize: 12 }}>
                  თამაშები აქვს — ვერ წაიშლება
                </span>
              ) : confirm ? (
                <button
                  className="btn danger"
                  onClick={() => {
                    deletePlayer(player.id);
                    toast(`${player.name} წაიშალა`, 'info');
                    onClose();
                  }}
                >
                  ნამდვილად წავშალო?
                </button>
              ) : (
                <button className="btn ghost danger" onClick={() => setConfirm(true)}>
                  <Trash /> წაშლა
                </button>
              )}
            </div>
          )}
          <button className="btn" style={{ marginLeft: isNew ? 'auto' : undefined }} onClick={onClose}>
            გაუქმება
          </button>
          <button className="btn primary" disabled={!valid} onClick={save}>
            {isNew ? 'დამატება' : 'შენახვა'} <Kbd k="↵" />
          </button>
        </>
      }
    >
      <div className="preview-avatar">
        <Avatar player={draft} key={draft.emoji + draft.color} className="bump" />
      </div>
      <label className="field">
        <span>სახელი</span>
        <input
          className="input"
          autoFocus
          value={draft.name}
          maxLength={24}
          placeholder="მაგ. ბებო"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        {dupe && <small style={{ color: 'var(--bad)' }}>ეს სახელი უკვე დაკავებულია</small>}
      </label>
      <div className="field">
        <span>ავატარი</span>
        <div className="emoji-grid">
          {EMOJIS.map((e) => (
            <button key={e} className={cx(draft.emoji === e && 'on')} onClick={() => setDraft({ ...draft, emoji: e })} aria-label={e}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>ფერი</span>
        <div className="swatches">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
            <button
              key={c}
              className={cx(draft.color === c && 'on')}
              style={pcStyle({ color: c })}
              onClick={() => setDraft({ ...draft, color: c })}
              aria-label={COLOR_NAMES[c]}
              title={COLOR_NAMES[c]}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
