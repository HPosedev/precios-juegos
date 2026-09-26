import { Database } from 'bun:sqlite';
import { resolve } from 'path';
import type { TrackedGame } from './types';

const dbPath = resolve(process.cwd(), 'games.db');
export const db = new Database(dbPath);

// Initialize tables
db.run(`
  CREATE TABLE IF NOT EXISTS tracked_games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    image_url TEXT NOT NULL,
    steam_app_id INTEGER,
    added_at TEXT NOT NULL,
    last_checked TEXT NOT NULL,
    lowest_price REAL NOT NULL,
    lowest_store TEXT NOT NULL,
    lowest_region TEXT NOT NULL,
    lowest_url TEXT NOT NULL,
    lowest_key_type TEXT NOT NULL,
    official_price REAL,
    offers_json TEXT NOT NULL
  );
`);

function rowToGame(row: any): TrackedGame {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    imageUrl: row.image_url,
    steamAppId: row.steam_app_id,
    addedAt: row.added_at,
    lastChecked: row.last_checked,
    lowestPrice: row.lowest_price,
    lowestStore: row.lowest_store,
    lowestRegion: row.lowest_region,
    lowestUrl: row.lowest_url,
    lowestKeyType: row.lowest_key_type,
    officialPrice: row.official_price ?? undefined,
    offers: JSON.parse(row.offers_json || '[]'),
  };
}

export function getAllTrackedGames(): TrackedGame[] {
  const rows = db.query(`SELECT * FROM tracked_games ORDER BY added_at DESC`).all() as any[];
  return rows.map(rowToGame);
}

export function getTrackedGameById(id: string): TrackedGame | null {
  const row = db.query(`SELECT * FROM tracked_games WHERE id = ?`).get(id) as any;
  return row ? rowToGame(row) : null;
}

/**
 * Finds an already tracked game by Steam App ID or, failing that, by slug.
 */
export function findTrackedGame(slug: string, steamAppId?: number | null): TrackedGame | null {
  if (steamAppId) {
    const row = db.query(`SELECT * FROM tracked_games WHERE steam_app_id = ? LIMIT 1`).get(steamAppId) as any;
    if (row) return rowToGame(row);
  }
  // Titles made only of non-Latin characters produce an empty slug, which can't identify a game
  if (!slug) return null;
  const row = db.query(`SELECT * FROM tracked_games WHERE slug = ? LIMIT 1`).get(slug) as any;
  return row ? rowToGame(row) : null;
}

export function saveTrackedGame(game: TrackedGame): void {
  const stmt = db.prepare(`
    INSERT INTO tracked_games (
      id, title, slug, image_url, steam_app_id, added_at, last_checked,
      lowest_price, lowest_store, lowest_region, lowest_url, lowest_key_type,
      official_price, offers_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      slug = excluded.slug,
      image_url = excluded.image_url,
      steam_app_id = excluded.steam_app_id,
      last_checked = excluded.last_checked,
      lowest_price = excluded.lowest_price,
      lowest_store = excluded.lowest_store,
      lowest_region = excluded.lowest_region,
      lowest_url = excluded.lowest_url,
      lowest_key_type = excluded.lowest_key_type,
      official_price = excluded.official_price,
      offers_json = excluded.offers_json
  `);

  stmt.run(
    game.id,
    game.title,
    game.slug,
    game.imageUrl,
    game.steamAppId ?? null,
    game.addedAt,
    game.lastChecked,
    game.lowestPrice,
    game.lowestStore,
    game.lowestRegion,
    game.lowestUrl,
    game.lowestKeyType,
    game.officialPrice ?? null,
    JSON.stringify(game.offers)
  );
}

export function deleteTrackedGame(id: string): boolean {
  const stmt = db.prepare(`DELETE FROM tracked_games WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}
