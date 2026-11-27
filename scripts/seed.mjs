// Fills data/joker.json with a few months of believable demo results.
//   npm run seed            (refuses to overwrite real data)
//   npm run seed -- --force
import { promises as fs } from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.env.DATA_DIR || 'data', 'joker.json');
const force = process.argv.includes('--force');

try {
  const existing = JSON.parse(await fs.readFile(file, 'utf8'));
  if (existing.games?.length && !force) {
    console.error(`✋ ${file} already has ${existing.games.length} games. Use --force to overwrite.`);
    process.exit(1);
  }
} catch {}

let seed = 20261126;
const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const gauss = () => (rand() + rand() + rand() - 1.5) * 1.15;
const id = () => Math.floor(rand() * 2 ** 52).toString(36).padStart(10, '0');

const now = new Date();
const players = [
  { name: 'ნიკა', emoji: '🦊', color: 5, skill: 1660 },
  { name: 'ტატო', emoji: '🐻', color: 1, skill: 1570 },
  { name: 'ნუცა', emoji: '🌻', color: 4, skill: 1500 },
  { name: 'დიმა', emoji: '🚀', color: 3, skill: 1400 },
].map((p) => ({ id: id(), createdAt: new Date(now.getTime() - 120 * 864e5).toISOString(), ...p }));

const games = [];
for (let day = 95; day >= 0; day--) {
  if (rand() < 0.12) continue; // the occasional night off
  const count = rand() < 0.3 ? 2 : 1;
  for (let k = 0; k < count; k++) {
    const when = new Date(now);
    when.setDate(when.getDate() - day);
    when.setHours(20 + k, Math.floor(rand() * 60), 0, 0);
    if (when > now) continue;
    const seats = [...players].sort(() => rand() - 0.5);
    games.push({
      id: id(),
      createdAt: when.toISOString(),
      playedAt: when.toISOString(),
      playerIds: seats.map((p) => p.id),
      scores: seats.map((p) => Math.round((p.skill + gauss() * 520) / 10) * 10),
    });
  }
}

await fs.mkdir(path.dirname(file), { recursive: true });
await fs.writeFile(file, JSON.stringify({ version: 2, players: players.map(({ skill, ...p }) => p), games }, null, 2));
console.log(`🃏 Seeded ${players.length} players and ${games.length} games into ${file}`);
