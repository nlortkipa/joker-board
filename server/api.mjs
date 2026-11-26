// Tiny JSON-file backed API. No database, no dependencies.
// Everything lives in <DATA_DIR>/joker.json so backups are a single file copy.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const EMPTY = () => ({ version: 2, players: [], games: [] });
const MAX_BODY = 5 * 1024 * 1024;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

export function createApi({ dataDir = 'data' } = {}) {
  const file = path.resolve(dataDir, 'joker.json');
  let db = null;
  let queue = Promise.resolve();

  async function load() {
    if (db) return db;
    try {
      db = { ...EMPTY(), ...JSON.parse(await fs.readFile(file, 'utf8')) };
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      db = EMPTY();
    }
    return db;
  }

  // Serialize writes and write atomically (tmp file + rename).
  function persist() {
    queue = queue.then(async () => {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db, null, 2));
      await fs.rename(tmp, file);
    });
    return queue;
  }

  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body === undefined ? '' : JSON.stringify(body));
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          reject(Object.assign(new Error('Body too large'), { status: 413 }));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'));
        } catch {
          reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
        }
      });
      req.on('error', reject);
    });

  const isPlayer = (p) => p && typeof p === 'object' && ID.test(p.id) && typeof p.name === 'string';
  const isGame = (g) =>
    g &&
    typeof g === 'object' &&
    ID.test(g.id) &&
    typeof g.playedAt === 'string' &&
    Array.isArray(g.playerIds) &&
    Array.isArray(g.scores) &&
    g.playerIds.length === g.scores.length &&
    g.scores.every((n) => typeof n === 'number' && Number.isFinite(n));

  function upsert(list, item) {
    const i = list.findIndex((x) => x.id === item.id);
    if (i === -1) list.push(item);
    else list[i] = item;
  }

  return async function api(req, res, next) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return next ? next() : send(res, 404, { error: 'Not found' });

    try {
      const data = await load();
      const [, , kind, id] = url.pathname.split('/');
      const method = req.method;

      if (kind === 'health') return send(res, 200, { ok: true });

      if (kind === 'state') {
        if (method === 'GET') return send(res, 200, data);
        if (method === 'PUT') {
          const body = await readBody(req);
          if (!body || !Array.isArray(body.players) || !Array.isArray(body.games))
            return send(res, 400, { error: 'Expected { players: [], games: [] }' });
          if (!body.players.every(isPlayer) || !body.games.every(isGame))
            return send(res, 400, { error: 'Backup file contains invalid records' });
          db = { version: 2, players: body.players, games: body.games };
          await persist();
          return send(res, 200, db);
        }
      }

      if ((kind === 'players' || kind === 'games') && id && ID.test(id)) {
        const list = data[kind];
        if (method === 'PUT') {
          const body = await readBody(req);
          const valid = kind === 'players' ? isPlayer(body) : isGame(body);
          if (!valid || body.id !== id) return send(res, 400, { error: `Invalid ${kind.slice(0, -1)}` });
          upsert(list, body);
          await persist();
          return send(res, 200, body);
        }
        if (method === 'DELETE') {
          data[kind] = list.filter((x) => x.id !== id);
          await persist();
          return send(res, 204);
        }
      }

      return send(res, 404, { error: 'Not found' });
    } catch (err) {
      console.error(err);
      return send(res, err.status || 500, { error: err.status ? err.message : 'Server error' });
    }
  };
}
