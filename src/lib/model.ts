// Data model: we only log results. A game is a date, four players and
// their final scores — the highest score wins.

export interface Player {
  id: string;
  name: string;
  emoji: string;
  color: number; // 1..8 palette slot
  createdAt: string;
}

export interface Game {
  id: string;
  playedAt: string; // when the game was played
  createdAt: string;
  playerIds: string[];
  scores: number[]; // same order as playerIds
}

export const SEATS = 4;

/** 1-based places; ties share a place. */
export const placesOf = (scores: number[]) => scores.map((s) => 1 + scores.filter((o) => o > s).length);

/** Scores read best ungrouped ("2480"); decimals use a comma, negatives a real minus. */
export function fmtScore(n: number) {
  const abs = Math.round(Math.abs(n) * 10) / 10;
  const text = String(abs).replace('.', ',');
  return n < 0 && abs !== 0 ? `−${text}` : text;
}

/** Accepts "1 250", "1250", "12,5", "-300", "−300". */
export function parseScore(raw: string): number | null {
  const t = raw.replace(/\s/g, '').replace('−', '-').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}
