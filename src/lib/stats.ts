import { placesOf, type Game, type Player } from './model';

export type Period = 'week' | 'month' | 'year' | 'all';

export const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'კვირა' },
  { id: 'month', label: 'თვე' },
  { id: 'year', label: 'წელი' },
  { id: 'all', label: 'სულ' },
];

export function periodStart(period: Period, now = new Date()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  else if (period === 'month') d.setDate(1);
  else if (period === 'year') d.setMonth(0, 1);
  else return 0;
  return d.getTime();
}

export interface Result {
  game: Game;
  places: number[];
  time: number;
}

export function results(games: Game[], period: Period = 'all'): Result[] {
  const from = periodStart(period);
  return games
    .map((game) => ({ game, places: placesOf(game.scores), time: new Date(game.playedAt).getTime() }))
    .filter((r) => r.time >= from)
    .sort((a, b) => a.time - b.time);
}

export interface PlayerStats {
  player: Player;
  games: number;
  wins: number;
  lasts: number;
  winRate: number;
  avgPlace: number;
  avgScore: number;
  best: number;
  streak: number; // current win streak
  longest: number;
  form: number[]; // last 5 places, oldest → newest
}

export function playerStats(players: Player[], res: Result[]): PlayerStats[] {
  return players
    .map((player) => {
      let games = 0, wins = 0, lasts = 0, placeSum = 0, scoreSum = 0, best = -Infinity, streak = 0, longest = 0;
      const form: number[] = [];
      for (const { game, places } of res) {
        const seat = game.playerIds.indexOf(player.id);
        if (seat === -1) continue;
        games++;
        const place = places[seat];
        placeSum += place;
        scoreSum += game.scores[seat];
        best = Math.max(best, game.scores[seat]);
        if (place === Math.max(...places)) lasts++;
        if (place === 1) {
          wins++;
          streak++;
          longest = Math.max(longest, streak);
        } else streak = 0;
        form.push(place);
      }
      return {
        player,
        games,
        wins,
        lasts,
        winRate: games ? wins / games : 0,
        avgPlace: games ? placeSum / games : 0,
        avgScore: games ? scoreSum / games : 0,
        best: games ? best : 0,
        streak,
        longest,
        form: form.slice(-5),
      };
    })
    .sort(
      (a, b) =>
        Number(b.games > 0) - Number(a.games > 0) ||
        b.wins - a.wins ||
        b.winRate - a.winRate ||
        a.avgPlace - b.avgPlace ||
        b.avgScore - a.avgScore ||
        a.player.name.localeCompare(b.player.name, 'ka'),
    );
}

/** Cumulative wins after each game, per player. */
export function raceSeries(players: Player[], res: Result[]) {
  const counts: Record<string, number> = Object.fromEntries(players.map((p) => [p.id, 0]));
  return res.map(({ game, places, time }) => {
    const winners = game.playerIds.filter((_, s) => places[s] === 1);
    for (const w of winners) if (w in counts) counts[w]++;
    return { time, gameId: game.id, winners, counts: { ...counts } };
  });
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;
