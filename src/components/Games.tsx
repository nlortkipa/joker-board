import { useMemo } from 'react';
import { fmtScore, placesOf, type Game, type Player } from '../lib/model';
import { go } from '../lib/router';
import { playerMap, UNKNOWN } from '../lib/store';
import { cx, dayLabel, timeLabel } from '../lib/util';
import { Chevron, Plus } from './Icons';
import { Avatar, Empty, pcStyle } from './ui';

const countLabel = (n: number) => `${n} თამაში`;

export function Games({ players, games, onLog }: { players: Player[]; games: Game[]; onLog: () => void }) {
  const pm = useMemo(() => playerMap(players), [players]);
  const groups = useMemo(() => {
    const sorted = [...games].sort((a, b) => b.playedAt.localeCompare(a.playedAt));
    const out: { label: string; games: Game[] }[] = [];
    sorted.forEach((g) => {
      const label = dayLabel(new Date(g.playedAt).getTime());
      const last = out[out.length - 1];
      if (last?.label === label) last.games.push(g);
      else out.push({ label, games: [g] });
    });
    return out;
  }, [games]);

  if (!games.length)
    return (
      <Empty
        art="🎴"
        title="აქ თამაშების ისტორია იქნება"
        text="ყოველი ჩაწერილი თამაში აქ გამოჩნდება — ნებისმიერ დროს შეგიძლია გადახედო."
        action={
          <button className="btn primary large" onClick={onLog}>
            <Plus /> თამაშის ჩაწერა
          </button>
        }
      />
    );

  let n = 0;
  return (
    <>
      {groups.map((grp) => (
        <section className="game-group" key={grp.label}>
          <header className="game-group-head">
            <h4>{grp.label}</h4>
            <span>{countLabel(grp.games.length)}</span>
          </header>
          <div className="game-list">
            {grp.games.map((g) => {
              const places = placesOf(g.scores);
              const order = g.playerIds.map((_, s) => s).sort((a, b) => places[a] - places[b] || g.scores[b] - g.scores[a]);
              const winner = pm.get(g.playerIds[order[0]]) ?? UNKNOWN;
              return (
                <button
                  key={g.id}
                  className="game-row"
                  style={{ ...pcStyle(winner), animationDelay: `${Math.min(n++, 12) * 30}ms` }}
                  onClick={() => go(`/games/${g.id}`)}
                >
                  <b className="gr-time num">{timeLabel(g.playedAt)}</b>
                  <div className="gr-seats">
                    {order.map((s) => {
                      const p = pm.get(g.playerIds[s]) ?? UNKNOWN;
                      return (
                        <div key={s} className={cx('gr-seat', places[s] === 1 && 'win')}>
                          <Avatar player={p} size={32} />
                          <div className="gr-who">
                            <div className="nm">{p.name}</div>
                            <span className="sc num">{fmtScore(g.scores[s])}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Chevron className="chev" />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
