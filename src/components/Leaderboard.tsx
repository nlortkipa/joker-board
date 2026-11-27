import { useMemo, type CSSProperties } from 'react';
import { fmtScore, type Game, type Player } from '../lib/model';
import { pct, playerStats, results, type Period, type PlayerStats } from '../lib/stats';
import { cx, weekdayNarrow } from '../lib/util';
import { Plus } from './Icons';
import { RaceChart } from './RaceChart';
import { Avatar, Empty, Kbd, pcStyle } from './ui';

const STAGE_TITLE: Record<Period, string> = {
  week: 'კვირის ჩემპიონი',
  month: 'თვის ჩემპიონი',
  year: 'წლის ჩემპიონი',
  all: 'ოჯახის ჩემპიონი',
};

export function Leaderboard({
  players,
  games,
  period,
  onLog,
}: {
  players: Player[];
  games: Game[];
  period: Period;
  onLog: () => void;
}) {
  const res = useMemo(() => results(games, period), [games, period]);
  const all = useMemo(() => results(games, 'all'), [games]);
  const stats = useMemo(() => playerStats(players, res), [players, res]);
  const ranked = stats.filter((s) => s.games > 0);

  if (all.length === 0) {
    return (
      <Empty
        art="🃏"
        title="ჯერ არცერთი თამაში"
        text="ჩაწერე პირველი თამაშის შედეგი და რეიტინგი აქ გამოჩნდება."
        action={
          <button className="btn primary large" onClick={onLog}>
            <Plus /> თამაშის ჩაწერა <Kbd k="N" />
          </button>
        }
      />
    );
  }

  if (ranked.length === 0) {
    return (
      <Empty
        art="🌙"
        title="ამ პერიოდში თამაში არ ყოფილა"
        text="აირჩიე უფრო გრძელი პერიოდი — ან დაჯექით და ითამაშეთ!"
        action={
          <button className="btn primary" onClick={onLog}>
            <Plus /> თამაშის ჩაწერა
          </button>
        }
      />
    );
  }

  const leader = ranked[0];
  const podium = [ranked[1], ranked[0], ranked[2]];
  const top = (key: (s: PlayerStats) => number, min = 1) => {
    const best = [...ranked].sort((a, b) => key(b) - key(a))[0];
    return best && key(best) >= min ? best : null;
  };

  let rec: { p: Player; score: number } | null = null;
  let mar: { p: Player; diff: number } | null = null;
  for (const { game, places } of res) {
    game.scores.forEach((score, s) => {
      const p = players.find((x) => x.id === game.playerIds[s]);
      if (!p) return;
      if (!rec || score > rec.score) rec = { p, score };
      if (places[s] === 1) {
        const second = Math.max(...game.scores.filter((_, i) => i !== s));
        if (!mar || score - second > mar.diff) mar = { p, diff: score - second };
      }
    });
  }
  const record = rec as { p: Player; score: number } | null;
  const margin = mar as { p: Player; diff: number } | null;
  const hot = top((s) => s.longest);
  const steady = [...ranked].filter((s) => s.games >= 3).sort((a, b) => b.avgScore - a.avgScore)[0];

  const fame = [
    hot && { emoji: '🔥', tint: '#ff7a1a', label: 'ყველაზე გრძელი სერია', p: hot.player, value: hot.longest, unit: 'მოგება ზედიზედ' },
    record && { emoji: '🚀', tint: '#2f80ff', label: 'რეკორდული ქულა', p: record.p, value: fmtScore(record.score), unit: 'ქულა' },
    margin && margin.diff > 0 && { emoji: '💥', tint: '#ff3d7f', label: 'ყველაზე დიდი სხვაობა', p: margin.p, value: fmtScore(margin.diff), unit: 'ქულით წინ' },
    steady && { emoji: '🎯', tint: '#12b886', label: 'საუკეთესო საშუალო', p: steady.player, value: fmtScore(steady.avgScore), unit: 'საშუალო ქულა' },
  ].filter(Boolean) as { emoji: string; tint: string; label: string; p: Player; value: string | number; unit: string }[];

  // Last 14 days: who won the most games each day.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (13 - i));
    const start = d.getTime();
    const end = start + 86400000;
    const tally = new Map<string, number>();
    let count = 0;
    for (const r of all) {
      if (r.time < start || r.time >= end) continue;
      count++;
      r.game.playerIds.forEach((id, s) => r.places[s] === 1 && tally.set(id, (tally.get(id) ?? 0) + 1));
    }
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    return { start, count, winner: best ? players.find((p) => p.id === best[0]) : undefined, today: i === 13 };
  });

  return (
    <>
      <section className="stage">
        <span className="suit s1">♠</span>
        <span className="suit s2">♥</span>
        <span className="suit s3">♦</span>
        <span className="suit s4">♣</span>
        <div className="stage-head">
          <span className="eyebrow">🏆 {STAGE_TITLE[period]}</span>
          <h2>{leader.player.name}</h2>
          <p>
            {leader.wins} მოგება {leader.games} თამაშიდან · მოგების {pct(leader.winRate)}
          </p>
        </div>
        <div className="podium">
          {podium.map((s, i) =>
            s ? (
              <div key={s.player.id} className={cx('podium-spot', `p${[2, 1, 3][i]}`)} style={pcStyle(s.player)}>
                <Avatar player={s.player}>{i === 1 && <span className="crown">👑</span>}</Avatar>
                <div className="podium-name">{s.player.name}</div>
                <div className="podium-sub">
                  {pct(s.winRate)}
                  {s.streak >= 2 ? ` · 🔥${s.streak}` : ''}
                </div>
                <div className="podium-block">
                  <div className="place">{[2, 1, 3][i]}</div>
                  <div className="wins num">{s.wins} მოგება</div>
                </div>
              </div>
            ) : (
              <div key={i} />
            ),
          )}
        </div>
      </section>

      <div className="section-head">
        <h2>დიდების დარბაზი</h2>
      </div>
      <div className="fame">
        {fame.map((f, i) => (
          <div
            className="card fame-card"
            key={f.label}
            style={{ animationDelay: `${i * 60}ms`, '--tint': f.tint } as CSSProperties}
          >
            <div className="label">
              <span className="emoji">{f.emoji}</span> {f.label}
            </div>
            <div className="value num">
              {f.value}
              <small>{f.unit}</small>
            </div>
            <div className="who">
              <Avatar player={f.p} size={22} /> <b>{f.p.name}</b>
            </div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <h2>ცხრილი</h2>
        <span className="muted">{res.length} თამაში</span>
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>მოთამაშე</th>
              <th>მოგება</th>
              <th className="hide-sm">თამაში</th>
              <th>მოგების %</th>
              <th className="hide-sm">საშ. ადგილი</th>
              <th className="hide-md hide-sm">საშ. ქულა</th>
              <th className="hide-md hide-sm">რეკორდი</th>
              <th className="hide-sm">ფორმა</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => (
              <tr key={s.player.id} className={i < 3 ? `top${i + 1}` : undefined} style={{ ...pcStyle(s.player), animationDelay: `${i * 40}ms` }}>
                <td>
                  <div className="who-cell">
                    <span className={cx('rank', i < 3 && `r${i + 1}`)}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                    <Avatar player={s.player} size={30} />
                    <span>
                      {s.player.name}
                      {s.streak >= 2 && <span className="streak"> 🔥{s.streak}</span>}
                    </span>
                  </div>
                </td>
                <td>
                  <b>{s.wins}</b>
                </td>
                <td className="hide-sm">{s.games}</td>
                <td>
                  <span className="bar hide-sm">
                    <i style={{ width: pct(s.winRate) }} />
                  </span>
                  {pct(s.winRate)}
                </td>
                <td className="hide-sm">{s.avgPlace.toFixed(2).replace('.', ',')}</td>
                <td className="hide-md hide-sm">{fmtScore(Math.round(s.avgScore))}</td>
                <td className="hide-md hide-sm">{fmtScore(s.best)}</td>
                <td className="hide-sm">
                  <span className="form" aria-label={`ბოლო ადგილები: ${s.form.join(', ')}`}>
                    {s.form.map((pl, k) => (
                      <i key={k} className={cx(`p${Math.min(pl, 4)}`, pl === 1 && 'w')}>
                        {pl}
                      </i>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {res.length > 1 && (
        <>
          <div className="section-head">
            <h2>რბოლა</h2>
            <span className="muted">მოგებების ჯამი</span>
          </div>
          <div className="card chart-card">
            <RaceChart players={ranked.map((s) => s.player)} res={res} />
          </div>
        </>
      )}

      <div className="section-head">
        <h2>დღის ჩემპიონები</h2>
        <span className="muted">ბოლო ორი კვირა</span>
      </div>
      <div className="recent-strip">
        {days.map((d) => (
          <div
            key={d.start}
            className={cx('day-cell', d.today && 'today', d.winner && 'won')}
            style={d.winner ? pcStyle(d.winner) : undefined}
            title={d.winner ? `${d.winner.name} · ${d.count} თამაში` : 'თამაში არ ყოფილა'}
          >
            {weekdayNarrow(d.start)}
            {d.winner ? <Avatar player={d.winner} /> : <span className="none" />}
            <span className="num">{new Date(d.start).getDate()}</span>
          </div>
        ))}
      </div>
    </>
  );
}
