import { fmtScore, placesOf, type Game, type Player } from '../lib/model';
import { UNKNOWN } from '../lib/store';
import { toast } from '../lib/toast';
import { dayLabel, timeLabel } from '../lib/util';
import { Pencil, Share, Trash } from './Icons';
import { Avatar, Kbd, pcStyle } from './ui';

const MEDALS = ['🥇', '🥈', '🥉', '4'];

export function ranked(game: Game, players: Player[]) {
  const pm = new Map(players.map((p) => [p.id, p]));
  const places = placesOf(game.scores);
  return game.playerIds
    .map((id, s) => ({ p: pm.get(id) ?? UNKNOWN, score: game.scores[s], place: places[s] }))
    .sort((a, b) => a.place - b.place || b.score - a.score);
}

export const gameTitle = (game: Game) => `${dayLabel(new Date(game.playedAt).getTime())} · ${timeLabel(game.playedAt)}`;

export async function shareGame(game: Game, players: Player[]) {
  const lines = ranked(game, players).map((r) => `${MEDALS[r.place - 1] ?? `${r.place}.`} ${r.p.emoji} ${r.p.name} — ${fmtScore(r.score)}`);
  const text = `🃏 ჯოკერი · ${gameTitle(game)}\n${lines.join('\n')}`;
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) return void (await navigator.share({ text }));
    await navigator.clipboard.writeText(text);
    toast('შედეგი დაკოპირდა');
  } catch (e) {
    if ((e as Error).name !== 'AbortError') toast('გაზიარება ვერ მოხერხდა', 'error');
  }
}

export function GameResult({
  game,
  players,
  onEdit,
  onAgain,
  onDelete,
}: {
  game: Game;
  players: Player[];
  onEdit: () => void;
  onAgain: () => void;
  onDelete: () => void;
}) {
  const rows = ranked(game, players);
  const winners = rows.filter((r) => r.place === 1);
  const max = Math.max(...rows.map((r) => Math.abs(r.score)), 1);

  return (
    <>
      <section className="stage result-stage" style={pcStyle(winners[0].p)}>
        <span className="suit s1">♠</span>
        <span className="suit s2">♥</span>
        <span className="suit s3">♦</span>
        <span className="suit s4">♣</span>
        <div className="result-hero">
          <Avatar player={winners[0].p}>
            <span className="crown">👑</span>
          </Avatar>
          <div>
            <span className="eyebrow">🏆 {winners.length > 1 ? 'გამარჯვებულები' : 'გამარჯვებული'}</span>
            <h2>{winners.map((w) => w.p.name).join(' და ')}</h2>
            <p>
              {fmtScore(winners[0].score)} ქულა
              {winners.length === 1 && rows[1] ? ` · ${fmtScore(winners[0].score - rows[1].score)} ქულით წინ` : ''}
            </p>
          </div>
        </div>
      </section>

      <div className="card result-list">
        {rows.map((r, i) => (
          <div key={r.p.id + i} className="result-row" style={{ ...pcStyle(r.p), animationDelay: `${120 + i * 70}ms` }}>
            <span className="medal">{MEDALS[r.place - 1] ?? r.place}</span>
            <Avatar player={r.p} />
            <div className="rr-main">
              <div className="rr-top">
                <b>{r.p.name}</b>
                <span className="num rr-score">{fmtScore(r.score)}</span>
              </div>
              <div className="rr-bar">
                <i style={{ width: `${Math.max(2, (Math.max(0, r.score) / max) * 100)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="result-actions">
        <button className="btn large" onClick={onEdit}>
          <Pencil /> რედაქტირება <Kbd k="E" />
        </button>
        <button className="btn large" onClick={onAgain}>
          🔁 იგივე შემადგენლობით
        </button>
        <button className="btn large" onClick={() => shareGame(game, players)}>
          <Share /> გაზიარება
        </button>
        <button className="btn large ghost danger" onClick={onDelete}>
          <Trash /> წაშლა
        </button>
      </div>
    </>
  );
}
