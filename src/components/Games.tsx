import { useMemo } from 'react';
import { fmtScore, placesOf, type Game, type Player } from '../lib/model';
import { go } from '../lib/router';
import { playerMap, UNKNOWN } from '../lib/store';
import { cx, dayLabel, timeLabel } from '../lib/util';
import { Chevron, Plus } from './Icons';
import { Avatar, Empty, Kbd, pcStyle } from './ui';

export function Games({ players, games, onLog }: { players: Player[]; games: Game[]; onLog: () => void }) {
  const pm = useMemo(() => playerMap(players), [players]);
  const groups = useMemo(() => {
    const sorted = [...games].sort((a, b) => b.playedAt.localeCompare(a.playedAt));
    const out: { label: string; games: Game[] }[] = [];
    for (const g of sorted) {
      const label = dayLabel(new Date(g.playedAt).getTime());
      const last = out[out.length - 1];
      if (last?.label === label) last.games.push(g);
      else out.push({ label, games: [g] });
    }
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
            <Plus /> თამაშის ჩაწერა <Kbd k="N" />
          </button>
        }
      />
    );

  let n = 0;
  return (
    <>
      {groups.map((grp) => (
        <div className="game-group" key={grp.label}>
          <h4>{grp.label}</h4>
          {grp.games.map((g) => {
            const places = placesOf(g.scores);
            const order = g.playerIds.map((_, s) => s).sort((a, b) => places[a] - places[b]);
            return (
              <button
                key={g.id}
                className="card game-row"
                style={{ ...pcStyle(pm.get(g.playerIds[order[0]]) ?? UNKNOWN), animationDelay: `${Math.min(n++, 12) * 30}ms` }}
                onClick={() => go(`/games/${g.id}`)}
              >
                <div className="meta">
                  <b>{timeLabel(g.playedAt)}</b>
                </div>
                <div className="seats">
                  {order.map((s) => {
                    const p = pm.get(g.playerIds[s]) ?? UNKNOWN;
                    const win = places[s] === 1;
                    return (
                      <div key={s} className={cx('seat-res', win && 'win')} style={pcStyle(p)}>
                        <Avatar player={p} />
                        <div className="n">
                          <div>{p.name}</div>
                          <span className="num">
                            {win ? '🏆 ' : ''}
                            {fmtScore(g.scores[s])}
                          </span>
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
      ))}
    </>
  );
}
